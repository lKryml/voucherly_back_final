

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_password_complexity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.password !~ '\d' THEN
    RAISE EXCEPTION 'Password must contain at least one digit';
  END IF;
  IF NEW.password !~ '[A-Z]' THEN
    RAISE EXCEPTION 'Password must contain at least one uppercase letter';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_password_complexity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_voucher_batch"("code_length" integer, "value" numeric, "include_numbers" boolean, "include_letters" boolean, "currency" "text", "distributor_id" bigint, "expiry_date" timestamp with time zone, "count" integer, "created_by" bigint, "template_id" bigint DEFAULT NULL::bigint, "serial_prefix" "text" DEFAULT 'VCH'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  new_batch_id BIGINT;
  batch_serial TEXT;
  generated_count INT;
  max_attempts_per_code INT := 5;
BEGIN
  -- Validate critical parameters (no template checks)
  IF code_length NOT BETWEEN 10 AND 20 THEN
    RAISE EXCEPTION 'Code length must be between 10-20 characters';
  END IF;
  
  IF value <= 0 THEN
    RAISE EXCEPTION 'Voucher value must be positive';
  END IF;

  IF expiry_date < CURRENT_TIMESTAMP THEN
    RAISE EXCEPTION 'Expiry date must be in the future';
  END IF;

  IF count <= 0 THEN
    RAISE EXCEPTION 'Count must be a positive integer';
  END IF;

  -- Generate batch serial
  batch_serial := generate_sequential_serial(serial_prefix, 8, 'YYMMDD');

  -- Start transaction
  BEGIN
    -- Create batch (template_id stored but not used for validation)
    INSERT INTO batches(
      serial_number,
      status,
      total_value,
      voucher_count,
      currency,
      distributor_id,
      template_id,
      expiry_date,
      created_by
    ) VALUES (
      batch_serial,
      'generating',
      value * count,
      count,
      currency,
      distributor_id,
      template_id,
      expiry_date,
      created_by
    ) RETURNING id INTO new_batch_id;

    -- Generate unique voucher codes
    WITH candidate_codes AS (
      SELECT DISTINCT ON (code)
        generate_redemption_code(
          code_length,
          include_numbers,
          include_letters
        ) AS code
      FROM generate_series(1, count * max_attempts_per_code)
    ),
    unique_codes AS (
      SELECT code
      FROM candidate_codes
      WHERE NOT EXISTS (
        SELECT 1 FROM vouchers WHERE redemption_code = code
      )
      LIMIT count
    )
    INSERT INTO vouchers(
      redemption_code,
      serial_number,
      value,
      currency,
      distributor_id,
      batch_id,
      expiry_date,
      status,
      template_id
    )
    SELECT
      uc.code,
      generate_sequential_serial(serial_prefix, 8, 'YYMMDD'),
      value,
      currency,
      distributor_id,
      new_batch_id,
      expiry_date,
      'valid',
      template_id  -- Track template but don't enforce constraints
    FROM unique_codes uc;

    -- Finalize batch
    GET DIAGNOSTICS generated_count = ROW_COUNT;

    UPDATE batches
    SET 
      status = 'completed',
      total_value = value * generated_count,
      voucher_count = generated_count,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = new_batch_id;

    RETURN jsonb_build_object(
      'batch_id', new_batch_id,
      'serial_number', batch_serial,
      'generated_count', generated_count,
      'total_value', value * generated_count
    );

  EXCEPTION WHEN others THEN
    UPDATE batches
    SET status = 'failed', updated_at = CURRENT_TIMESTAMP
    WHERE id = new_batch_id;
    RAISE;
  END;
END;$$;


ALTER FUNCTION "public"."create_voucher_batch"("code_length" integer, "value" numeric, "include_numbers" boolean, "include_letters" boolean, "currency" "text", "distributor_id" bigint, "expiry_date" timestamp with time zone, "count" integer, "created_by" bigint, "template_id" bigint, "serial_prefix" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_redemption_code"("length" integer DEFAULT 10, "numbers" boolean DEFAULT true, "letters" boolean DEFAULT true) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$DECLARE

letters_pool TEXT := 'ACDEFGHKLMNOQRSTUVWXYZ';

numbers_pool TEXT := '123456789';

full_pool TEXT;

pool_length INT;

random_bytes BYTEA;

code TEXT;

BEGIN

IF NOT numbers AND NOT letters THEN

RAISE EXCEPTION 'Must include numbers or letters';

END IF;

full_pool := '';

IF letters THEN full_pool := full_pool || letters_pool; END IF;

IF numbers THEN full_pool := full_pool || numbers_pool; END IF;


pool_length := LENGTH(full_pool);
  random_bytes := gen_random_bytes(length * 2);

IF pool_length = 0 THEN

RAISE EXCEPTION 'Empty character pool';

END IF;



SELECT STRING_AGG(
      SUBSTR(
        full_pool,
        (  -- Calculate index safely
          (get_byte(random_bytes, g) << 8 | get_byte(random_bytes, g + 1)) 
          % pool_length  -- 0-based index
        ) + 1,  -- Convert to 1-based for SUBSTR
        1
      ),
      ''

)

INTO code

FROM generate_series(0, (Length * 2) - 2, 2) g;

RETURN code;

END;$$;


ALTER FUNCTION "public"."generate_redemption_code"("length" integer, "numbers" boolean, "letters" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_sequential_serial"("input_prefix" "text" DEFAULT 'SER'::"text", "segment_length" integer DEFAULT 6, "date_format" "text" DEFAULT 'YYYYMMDD'::"text", "max_retries" integer DEFAULT 5) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  current_gen_date DATE := CURRENT_DATE;
  formatted_date TEXT;
  next_val BIGINT;
  final_serial TEXT;
  retry_count INT := 0;
BEGIN
  IF segment_length < 3 OR segment_length > 9 THEN
    RAISE EXCEPTION 'Segment length must be between 3-9 digits';
  END IF;

  IF LENGTH(input_prefix) > 8 THEN  -- Use renamed parameter
    RAISE EXCEPTION 'Prefix cannot exceed 8 characters';
  END IF;

  formatted_date := TO_CHAR(current_gen_date, date_format);

  LOOP
    BEGIN
      -- Use renamed parameter in INSERT
      INSERT INTO serial_sequence_meta (prefix, gen_date, last_value)
      VALUES (
        input_prefix,  -- No ambiguity now
        current_gen_date,
        1
      )
      ON CONFLICT (prefix, gen_date) DO UPDATE  -- Refers to table columns
      SET last_value = serial_sequence_meta.last_value + 1
      RETURNING last_value INTO next_val;

       final_serial := format(
        '%s-%s-%s',  -- Use %s for all components
        upper(input_prefix),
        formatted_date,
        LPAD(next_val::TEXT, segment_length, '0')  -- Force zero-padding
      );

      RETURN final_serial;

    EXCEPTION WHEN unique_violation THEN
      retry_count := retry_count + 1;
      IF retry_count >= max_retries THEN
        RAISE EXCEPTION 'Failed to generate serial after % retries', max_retries;
      END IF;
    END;
  END LOOP;
END;$$;


ALTER FUNCTION "public"."generate_sequential_serial"("input_prefix" "text", "segment_length" integer, "date_format" "text", "max_retries" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_vouchers"("batch_id" bigint, "code_length" integer, "value" numeric, "include_numbers" boolean, "include_letters" boolean, "currency" "text", "distributor_id" bigint, "expiry_date" timestamp with time zone, "count" integer, "template_id" bigint DEFAULT NULL::bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$

DECLARE

max_attempts_per_code INT := 5;

BEGIN

IF code_length NOT BETWEEN 10 AND 20 THEN

RAISE EXCEPTION 'Code length must be between 10-20 characters';

END IF;


IF value <= 0 THEN

RAISE EXCEPTION 'Voucher value must be positive';

END IF;

IF expiry_date < CURRENT_TIMESTAMP THEN

RAISE EXCEPTION 'Expiry date must be in the future';

END IF;

IF count <= 0 THEN

RAISE EXCEPTION 'Count must be a positive integer';

END IF;

WITH candidate_codes AS (

SELECT DISTINCT ON (code)

generate_redemption_code(

code_length,

include_numbers,

include_letters

) AS code

FROM generate_series(1, count * max_attempts_per_code)

),

unique_codes AS (

SELECT code

FROM candidate_codes

WHERE NOT EXISTS (

SELECT 1

FROM vouchers

WHERE vouchers.redemption_code = candidate_codes.code

)

LIMIT count

)

INSERT INTO vouchers(

redemption_code,

value,

currency,

distributor_id,

batch_id,

expiry_date,

status,

template_id

)

SELECT

uc.code,

value,

currency,

distributor_id,

batch_id,

expiry_date,

'valid',

template_id

FROM unique_codes uc;

IF NOT FOUND THEN

RAISE EXCEPTION 'No vouchers created';

ELSIF (SELECT count(*) FROM vouchers WHERE batch_id = generate_vouchers.batch_id) < count THEN

RAISE EXCEPTION 'Failed to generate % unique codes after % attempts',

count,

count * max_attempts_per_code;

END IF;

END;

$$;


ALTER FUNCTION "public"."generate_vouchers"("batch_id" bigint, "code_length" integer, "value" numeric, "include_numbers" boolean, "include_letters" boolean, "currency" "text", "distributor_id" bigint, "expiry_date" timestamp with time zone, "count" integer, "template_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_voucher_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  change_reason TEXT;
BEGIN
  change_reason := current_setting('voucher.change_reason', TRUE);

  -- If change_reason is NULL or empty, set it to 'no reason'
  IF change_reason IS NULL OR change_reason = '' THEN
    change_reason := 'no reason';
  END IF;
  
  INSERT INTO voucher_audit_logs (
    voucher_id,
    changed_by,
    field_name,
    old_value,
    new_value,
    reason
  )
  VALUES (
    OLD.id,
    auth.uid(),
    'multiple', -- Static value since we're logging all changes
    to_jsonb(OLD) - 'updated_at',
    to_jsonb(NEW) - 'updated_at',
    change_reason
  );

  RETURN NEW;
END;$$;


ALTER FUNCTION "public"."log_voucher_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_voucher_change_reason"("reason" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  IF reason IS NULL OR reason = '' THEN
    PERFORM set_config('voucher.change_reason', 'no reason', FALSE);
  ELSE
    PERFORM set_config('voucher.change_reason', reason, true);
  END IF;
END;$$;


ALTER FUNCTION "public"."set_voucher_change_reason"("reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_voucher_count_and_total_value"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update the voucher_count and total_value for the batch associated with the voucher
    UPDATE batches
    SET
        voucher_count = (
            SELECT COUNT(*)
            FROM vouchers
            WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id)
            AND is_deleted = false
        ),
        total_value = (
            SELECT COALESCE(SUM(value), 0) -- Use COALESCE to handle cases where there are no vouchers
            FROM vouchers
            WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id)
            AND is_deleted = false
        )
    WHERE id = COALESCE(NEW.batch_id, OLD.batch_id);

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_voucher_count_and_total_value"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_voucher_status"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE vouchers SET status = 'expired'
  WHERE expiry_date < NOW() AND status != 'expired';
END;
$$;


ALTER FUNCTION "public"."update_voucher_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_login"("p_phone_number" "text", "p_password" "text") RETURNS TABLE("id" bigint, "phone_number" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.phone_number
  FROM users u
  WHERE u.phone_number = p_phone_number
  AND u.password= crypt(p_password, u.password);
END;
$$;


ALTER FUNCTION "public"."user_login"("p_phone_number" "text", "p_password" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."batches" (
    "id" bigint NOT NULL,
    "serial_number" "text",
    "status" "text" DEFAULT 'valid'::"text" NOT NULL,
    "total_value" numeric DEFAULT 0 NOT NULL,
    "voucher_count" integer DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT '''LYD''::text'::"text" NOT NULL,
    "distributor_id" bigint,
    "template_id" bigint,
    "expiry_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" bigint,
    "is_deleted" boolean DEFAULT false
);


ALTER TABLE "public"."batches" OWNER TO "postgres";


ALTER TABLE "public"."batches" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."batches_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."distributors" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "fee" numeric DEFAULT 0 NOT NULL,
    "phone" "text",
    "currency" "text" DEFAULT 'LYD'::"text" NOT NULL,
    "is_percentage" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "logo" "text",
    "created_by" integer,
    "email" "text",
    "website" "text",
    "status" smallint DEFAULT '1'::smallint NOT NULL,
    "is_deleted" boolean DEFAULT false
);


ALTER TABLE "public"."distributors" OWNER TO "postgres";


ALTER TABLE "public"."distributors" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."distributors_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE SEQUENCE IF NOT EXISTS "public"."global_serial_meta_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."global_serial_meta_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."serial_sequence_meta" (
    "id" integer DEFAULT "nextval"('"public"."global_serial_meta_seq"'::"regclass") NOT NULL,
    "prefix" "text" NOT NULL,
    "gen_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "last_value" bigint NOT NULL,
    CONSTRAINT "serial_sequence_meta_last_value_check" CHECK (("last_value" >= 0))
);


ALTER TABLE "public"."serial_sequence_meta" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "length" integer DEFAULT 12 NOT NULL,
    "value" numeric DEFAULT 0 NOT NULL,
    "include_numbers" boolean DEFAULT true NOT NULL,
    "include_letters" boolean DEFAULT true NOT NULL,
    "distributor_id" bigint,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" bigint DEFAULT '1'::bigint NOT NULL,
    "is_deleted" boolean DEFAULT false,
    "default_expiry" interval DEFAULT '360 days'::interval,
    "allowed_currencies" "text"[] DEFAULT '{LYD}'::"text"[],
    "metadata" "jsonb",
    CONSTRAINT "valid_template" CHECK (("include_numbers" OR "include_letters"))
);


ALTER TABLE "public"."templates" OWNER TO "postgres";


ALTER TABLE "public"."templates" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."templates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."users" (
    "username" character varying(100) NOT NULL,
    "password" "text" NOT NULL,
    "phone_number" character varying(15),
    "session_token" "text",
    "email" "text",
    "full_name" "text",
    "status" smallint DEFAULT '1'::smallint,
    "role" "text",
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text"),
    "updated_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text"),
    "id" bigint NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE "public"."users" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."users_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."vouchers" (
    "id" bigint NOT NULL,
    "serial_number" "text" NOT NULL,
    "redemption_code" "text" NOT NULL,
    "status" "text" DEFAULT 'valid'::"text" NOT NULL,
    "value" numeric DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT '''LYD''::text'::"text" NOT NULL,
    "distributor_id" bigint,
    "template_id" bigint,
    "batch_id" bigint,
    "expiry_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" bigint,
    "is_deleted" boolean DEFAULT false,
    CONSTRAINT "positive_value" CHECK (("value" > (0)::numeric))
);


ALTER TABLE "public"."vouchers" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."voucher_activity" AS
 SELECT "vouchers"."status",
    "count"(*) FILTER (WHERE ("vouchers"."created_at" >= ("now"() - '01:00:00'::interval))) AS "last_hour",
    "count"(*) FILTER (WHERE ("vouchers"."created_at" >= ("now"() - '1 day'::interval))) AS "last_day"
   FROM "public"."vouchers"
  GROUP BY "vouchers"."status"
  WITH NO DATA;


ALTER TABLE "public"."voucher_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voucher_audit_logs" (
    "id" bigint NOT NULL,
    "voucher_id" bigint,
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "field_name" "text" NOT NULL,
    "old_value" "jsonb",
    "new_value" "jsonb",
    "reason" "text" NOT NULL,
    CONSTRAINT "voucher_audit_logs_reason_check" CHECK ((TRIM(BOTH FROM "reason") <> ''::"text"))
);


ALTER TABLE "public"."voucher_audit_logs" OWNER TO "postgres";


ALTER TABLE "public"."voucher_audit_logs" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."voucher_audit_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."vouchers" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."vouchers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_pkey" PRIMARY KEY ("id");



CREATE MATERIALIZED VIEW "public"."batch_summaries" AS
 SELECT "b"."id",
    "b"."serial_number",
    "b"."created_at",
    "count"("v"."id") FILTER (WHERE ("v"."status" = 'valid'::"text")) AS "valid_vouchers",
    "count"("v"."id") FILTER (WHERE ("v"."status" = 'redeemed'::"text")) AS "used_vouchers",
    "sum"("v"."value") FILTER (WHERE ("v"."status" = 'redeemed'::"text")) AS "redeemed_value"
   FROM ("public"."batches" "b"
     LEFT JOIN "public"."vouchers" "v" ON (("b"."id" = "v"."batch_id")))
  GROUP BY "b"."id"
  WITH NO DATA;


ALTER TABLE "public"."batch_summaries" OWNER TO "postgres";


ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_serial_number_key" UNIQUE ("serial_number");



ALTER TABLE ONLY "public"."distributors"
    ADD CONSTRAINT "distributors_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."distributors"
    ADD CONSTRAINT "distributors_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."distributors"
    ADD CONSTRAINT "distributors_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."distributors"
    ADD CONSTRAINT "distributors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."serial_sequence_meta"
    ADD CONSTRAINT "serial_sequence_meta_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."serial_sequence_meta"
    ADD CONSTRAINT "serial_sequence_meta_prefix_gen_date_key" UNIQUE ("prefix", "gen_date");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "uniq_redemption_code" UNIQUE ("redemption_code");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "uniq_voucher_serial" UNIQUE ("serial_number");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "unique_username" UNIQUE ("username");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_phone_number_key" UNIQUE ("phone_number");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voucher_audit_logs"
    ADD CONSTRAINT "voucher_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_batches_distributor_id" ON "public"."batches" USING "btree" ("distributor_id");



CREATE INDEX "idx_batches_template_id" ON "public"."batches" USING "btree" ("template_id");



CREATE INDEX "idx_templates_distributor_id" ON "public"."templates" USING "btree" ("distributor_id");



CREATE INDEX "idx_users_phone_number" ON "public"."users" USING "btree" ("phone_number");



CREATE INDEX "idx_vouchers_batch_id" ON "public"."vouchers" USING "btree" ("batch_id");



CREATE INDEX "idx_vouchers_distributor_id" ON "public"."vouchers" USING "btree" ("distributor_id");



CREATE INDEX "idx_vouchers_status_expiry" ON "public"."vouchers" USING "btree" ("status", "expiry_date");



CREATE INDEX "idx_vouchers_template_id" ON "public"."vouchers" USING "btree" ("template_id");



CREATE INDEX "serial_sequence_meta_prefix_date_idx" ON "public"."serial_sequence_meta" USING "btree" ("prefix", "gen_date");



CREATE UNIQUE INDEX "vouchers_redemption_code_idx" ON "public"."vouchers" USING "btree" ("redemption_code");



CREATE OR REPLACE TRIGGER "log_voucher_update" BEFORE UPDATE ON "public"."vouchers" FOR EACH ROW EXECUTE FUNCTION "public"."log_voucher_change"();



CREATE OR REPLACE TRIGGER "users_password_check" BEFORE INSERT OR UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."check_password_complexity"();



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "public"."distributors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "public"."distributors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."voucher_audit_logs"
    ADD CONSTRAINT "voucher_audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."voucher_audit_logs"
    ADD CONSTRAINT "voucher_audit_logs_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "public"."distributors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE SET NULL;



CREATE POLICY "Allow delete to batches" ON "public"."batches" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow delete to distributors" ON "public"."distributors" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow delete to templates" ON "public"."templates" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow delete to vouchers" ON "public"."vouchers" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow insert to batches" ON "public"."batches" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow insert to distributors" ON "public"."distributors" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow insert to templates" ON "public"."templates" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow insert to vouchers" ON "public"."vouchers" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow read access to batches" ON "public"."batches" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow read access to distributors" ON "public"."distributors" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow read access to templates" ON "public"."templates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow read access to vouchers" ON "public"."vouchers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow update to batches" ON "public"."batches" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Allow update to distributors" ON "public"."distributors" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Allow update to templates" ON "public"."templates" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Allow update to vouchers" ON "public"."vouchers" FOR UPDATE TO "authenticated" USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";









































































































































































































GRANT ALL ON FUNCTION "public"."check_password_complexity"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_password_complexity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_password_complexity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_voucher_batch"("code_length" integer, "value" numeric, "include_numbers" boolean, "include_letters" boolean, "currency" "text", "distributor_id" bigint, "expiry_date" timestamp with time zone, "count" integer, "created_by" bigint, "template_id" bigint, "serial_prefix" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_voucher_batch"("code_length" integer, "value" numeric, "include_numbers" boolean, "include_letters" boolean, "currency" "text", "distributor_id" bigint, "expiry_date" timestamp with time zone, "count" integer, "created_by" bigint, "template_id" bigint, "serial_prefix" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_voucher_batch"("code_length" integer, "value" numeric, "include_numbers" boolean, "include_letters" boolean, "currency" "text", "distributor_id" bigint, "expiry_date" timestamp with time zone, "count" integer, "created_by" bigint, "template_id" bigint, "serial_prefix" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_redemption_code"("length" integer, "numbers" boolean, "letters" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_redemption_code"("length" integer, "numbers" boolean, "letters" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_redemption_code"("length" integer, "numbers" boolean, "letters" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_sequential_serial"("input_prefix" "text", "segment_length" integer, "date_format" "text", "max_retries" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_sequential_serial"("input_prefix" "text", "segment_length" integer, "date_format" "text", "max_retries" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_sequential_serial"("input_prefix" "text", "segment_length" integer, "date_format" "text", "max_retries" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_vouchers"("batch_id" bigint, "code_length" integer, "value" numeric, "include_numbers" boolean, "include_letters" boolean, "currency" "text", "distributor_id" bigint, "expiry_date" timestamp with time zone, "count" integer, "template_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_vouchers"("batch_id" bigint, "code_length" integer, "value" numeric, "include_numbers" boolean, "include_letters" boolean, "currency" "text", "distributor_id" bigint, "expiry_date" timestamp with time zone, "count" integer, "template_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_vouchers"("batch_id" bigint, "code_length" integer, "value" numeric, "include_numbers" boolean, "include_letters" boolean, "currency" "text", "distributor_id" bigint, "expiry_date" timestamp with time zone, "count" integer, "template_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."log_voucher_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_voucher_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_voucher_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_voucher_change_reason"("reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_voucher_change_reason"("reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_voucher_change_reason"("reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_voucher_count_and_total_value"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_voucher_count_and_total_value"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_voucher_count_and_total_value"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_voucher_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_voucher_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_voucher_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_login"("p_phone_number" "text", "p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_login"("p_phone_number" "text", "p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_login"("p_phone_number" "text", "p_password" "text") TO "service_role";
























GRANT ALL ON TABLE "public"."batches" TO "anon";
GRANT ALL ON TABLE "public"."batches" TO "authenticated";
GRANT ALL ON TABLE "public"."batches" TO "service_role";



GRANT ALL ON SEQUENCE "public"."batches_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."batches_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."batches_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."distributors" TO "anon";
GRANT ALL ON TABLE "public"."distributors" TO "authenticated";
GRANT ALL ON TABLE "public"."distributors" TO "service_role";



GRANT ALL ON SEQUENCE "public"."distributors_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."distributors_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."distributors_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."global_serial_meta_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."global_serial_meta_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."global_serial_meta_seq" TO "service_role";



GRANT ALL ON TABLE "public"."serial_sequence_meta" TO "anon";
GRANT ALL ON TABLE "public"."serial_sequence_meta" TO "authenticated";
GRANT ALL ON TABLE "public"."serial_sequence_meta" TO "service_role";



GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";



GRANT ALL ON SEQUENCE "public"."templates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."templates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."templates_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."vouchers" TO "anon";
GRANT ALL ON TABLE "public"."vouchers" TO "authenticated";
GRANT ALL ON TABLE "public"."vouchers" TO "service_role";



GRANT ALL ON TABLE "public"."voucher_activity" TO "anon";
GRANT ALL ON TABLE "public"."voucher_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."voucher_activity" TO "service_role";



GRANT ALL ON TABLE "public"."voucher_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."voucher_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."voucher_audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."voucher_audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."voucher_audit_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."voucher_audit_logs_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."vouchers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."vouchers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."vouchers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."batch_summaries" TO "anon";
GRANT ALL ON TABLE "public"."batch_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_summaries" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
