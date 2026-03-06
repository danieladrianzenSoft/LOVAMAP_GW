using Data;
using Infrastructure.IHelpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Helpers
{
	public class DatabaseMaintenanceHelper : IDatabaseMaintenanceHelper
	{
		private readonly DataContext _context;
		private readonly ILogger<DatabaseMaintenanceHelper> _logger;

		public DatabaseMaintenanceHelper(DataContext context, ILogger<DatabaseMaintenanceHelper> logger)
		{
			_context = context;
			_logger = logger;
		}

		/// <summary>
		/// Advances any PostgreSQL identity sequences that have drifted behind their table's MAX(Id).
		/// Only moves sequences forward — never lowers them. Safe for production.
		/// </summary>
		public async Task FixIdentitySequencesAsync()
		{
			await _context.Database.ExecuteSqlRawAsync(@"
				DO $$
				DECLARE r RECORD;
				        max_id bigint;
				        seq_val bigint;
				BEGIN
				    FOR r IN
				        SELECT seq.oid AS seq_oid,
				               seq.relname AS seq_name,
				               tbl.relname AS tbl_name,
				               col.attname AS col_name
				        FROM pg_class seq
				        JOIN pg_depend d    ON d.objid = seq.oid
				        JOIN pg_class tbl   ON tbl.oid = d.refobjid
				        JOIN pg_attribute col ON col.attrelid = tbl.oid AND col.attnum = d.refobjsubid
				        WHERE seq.relkind = 'S'
				    LOOP
				        EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', r.col_name, r.tbl_name) INTO max_id;
				        EXECUTE format('SELECT last_value FROM %I', r.seq_name) INTO seq_val;
				        IF max_id >= seq_val THEN
				            PERFORM setval(r.seq_oid::regclass, max_id);
				            RAISE NOTICE 'Fixed sequence %: was %, now %', r.seq_name, seq_val, max_id;
				        END IF;
				    END LOOP;
				END $$;
			");

			_logger.LogInformation("Identity sequence check complete");
		}
	}
}
