-- Remove duplicate otp_store rows, keeping the most recent per phone number
-- This runs before prisma db push to prevent unique constraint failures
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'otp_store'
  ) THEN
    DELETE FROM otp_store
    WHERE id NOT IN (
      SELECT DISTINCT ON (phone) id
      FROM otp_store
      ORDER BY phone, "createdAt" DESC
    );
  END IF;
END $$;
