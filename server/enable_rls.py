import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from django.db import connection

def enable_rls_and_lockdown():
    with connection.cursor() as cursor:
        print("1. Enabling Row Level Security (RLS) on all public tables...")
        cursor.execute("""
        DO $$ 
        DECLARE 
            r RECORD;
        BEGIN 
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP 
                EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;'; 
            END LOOP; 
        END $$;
        """)
        print("   RLS enabled on all public tables.")

        print("2. Revoking anon and authenticated access from public schema tables...")
        cursor.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
                REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
                REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;
            END IF;
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
                REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
                REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM authenticated;
            END IF;
        END $$;
        """)
        print("   Permissions revoked from anon & authenticated.")

        print("3. Verifying RLS status:")
        cursor.execute("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;")
        results = cursor.fetchall()
        all_secured = True
        for t, rls in results:
            status = "SECURED (RLS ON)" if rls else "UNSECURED (RLS OFF)"
            print(f"   - {t}: {status}")
            if not rls:
                all_secured = False

        if all_secured:
            print("\nSUCCESS: All public tables are now protected with Row Level Security!")
        else:
            print("\nWARNING: Some tables could not be secured.")

def test_django_queries():
    print("\n4. Testing Django ORM connectivity and queries...")
    from django.contrib.auth import get_user_model
    from marketplace.models import Category, Listing

    User = get_user_model()
    user_count = User.objects.count()
    cat_count = Category.objects.count()
    listing_count = Listing.objects.count()

    print(f"   Django ORM test results:")
    print(f"   - Users in DB: {user_count}")
    print(f"   - Categories in DB: {cat_count}")
    print(f"   - Listings in DB: {listing_count}")
    print("   Django database operations are working seamlessly!")

if __name__ == '__main__':
    enable_rls_and_lockdown()
    test_django_queries()
