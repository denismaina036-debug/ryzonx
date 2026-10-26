import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/00104_controlled_financial_reconciliation.sql",
  "utf8"
);
const investor = "20000000-0000-4000-a000-000000000001";
const admin = "20000000-0000-4000-a000-000000000002";
const settlement = "20000000-0000-4000-a000-000000000003";
const sourceTransaction = "20000000-0000-4000-a000-000000000004";
const debit = "20000000-0000-4000-a000-000000000005";
const credit = "20000000-0000-4000-a000-000000000006";

describe("controlled financial reconciliation migration", () => {
  let db: PGlite;
  let initialized = false;
  const firstRow = <T>(rows: T[]): T => {
    expect(rows).not.toHaveLength(0);
    return rows[0]!;
  };

  beforeEach(async () => {
    if (initialized) {
      await db.exec(`
        TRUNCATE financial_reconciliation_entries, financial_reconciliation_batches,
          audit_logs, ledger_entries, ledger_transactions, ledger_accounts,
          cycle_investor_settlements, transactions, profiles CASCADE;
        INSERT INTO profiles VALUES ('${investor}'),('${admin}');
        INSERT INTO transactions VALUES ('${sourceTransaction}');
        INSERT INTO cycle_investor_settlements VALUES ('${settlement}');
        INSERT INTO ledger_accounts VALUES
          ('${debit}','INVESTOR_DEBIT','Investor source','liability','investor','${investor}','USD',true),
          ('${credit}','CYCLE_CREDIT','Cycle escrow','liability','investment_cycle',NULL,'USD',true);
        INSERT INTO ledger_transactions(id,reference,description,transaction_type,status)
        VALUES('20000000-0000-4000-a000-000000000007','OPEN','Opening','opening_balance','posted');
        INSERT INTO ledger_entries(transaction_id,account_id,entry_side,amount) VALUES
          ('20000000-0000-4000-a000-000000000007','${debit}','credit',100),
          ('20000000-0000-4000-a000-000000000007','${credit}','credit',50);
      `);
      return;
    }
    db = new PGlite();
    await db.exec(`
      CREATE ROLE service_role; CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE TYPE ledger_account_type AS ENUM ('asset','liability','equity','revenue','expense');
      CREATE TYPE ledger_owner_type AS ENUM ('platform','investor','pool_manager','investment_cycle','investment_allocation');
      CREATE TYPE ledger_entry_side AS ENUM ('debit','credit');
      CREATE TYPE ledger_transaction_type AS ENUM ('opening_balance','deposit_credit','allocation_reserve','allocation_settlement','allocation_release','distribution','adjustment','reversal','transfer','profit_distribution');
      CREATE TABLE profiles(id UUID PRIMARY KEY);
      CREATE TABLE transactions(id UUID PRIMARY KEY);
      CREATE TABLE cycle_investor_settlements(id UUID PRIMARY KEY);
      CREATE TABLE ledger_accounts(
        id UUID PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
        account_type ledger_account_type NOT NULL, owner_type ledger_owner_type NOT NULL,
        owner_id UUID, currency TEXT NOT NULL DEFAULT 'USD', is_active BOOLEAN NOT NULL DEFAULT true
      );
      CREATE TABLE ledger_transactions(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), reference TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL, transaction_type ledger_transaction_type NOT NULL,
        status TEXT NOT NULL, source_type TEXT, source_id UUID, actor_id UUID,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb, idempotency_key TEXT, created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE UNIQUE INDEX ledger_transactions_idempotency_unique
        ON ledger_transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;
      CREATE TABLE ledger_entries(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), transaction_id UUID NOT NULL REFERENCES ledger_transactions(id),
        account_id UUID NOT NULL REFERENCES ledger_accounts(id), entry_side ledger_entry_side NOT NULL,
        amount NUMERIC(18,2) NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', memo TEXT, created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE audit_logs(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), actor_id UUID, action TEXT,
        entity_type TEXT, entity_id UUID, old_values JSONB, new_values JSONB, created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
      CREATE OR REPLACE FUNCTION post_ledger_transaction_atomic(
        p_reference TEXT, p_description TEXT, p_transaction_type ledger_transaction_type,
        p_source_type TEXT, p_source_id UUID, p_actor_id UUID, p_metadata JSONB,
        p_idempotency_key TEXT, p_entries JSONB
      ) RETURNS JSONB LANGUAGE plpgsql AS $$
      DECLARE v ledger_transactions%ROWTYPE; item JSONB; created BOOLEAN := false;
      BEGIN
        INSERT INTO ledger_transactions(reference,description,transaction_type,status,source_type,source_id,actor_id,metadata,idempotency_key)
        VALUES(p_reference,p_description,p_transaction_type,'posted',p_source_type,p_source_id,p_actor_id,p_metadata,p_idempotency_key)
        ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING RETURNING * INTO v;
        IF v.id IS NULL THEN SELECT * INTO v FROM ledger_transactions WHERE idempotency_key=p_idempotency_key;
        ELSE
          created := true;
          FOR item IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
            INSERT INTO ledger_entries(transaction_id,account_id,entry_side,amount,memo)
            VALUES(v.id,(item->>'accountId')::UUID,(item->>'entrySide')::ledger_entry_side,(item->>'amount')::NUMERIC,item->>'memo');
          END LOOP;
        END IF;
        RETURN jsonb_build_object('transaction',to_jsonb(v),'created',created);
      END $$;
      INSERT INTO profiles VALUES ('${investor}'),('${admin}');
      INSERT INTO transactions VALUES ('${sourceTransaction}');
      INSERT INTO cycle_investor_settlements VALUES ('${settlement}');
      INSERT INTO ledger_accounts VALUES
        ('${debit}','INVESTOR_DEBIT','Investor source','liability','investor','${investor}','USD',true),
        ('${credit}','CYCLE_CREDIT','Cycle escrow','liability','investment_cycle',NULL,'USD',true);
      INSERT INTO ledger_transactions(id,reference,description,transaction_type,status)
      VALUES('20000000-0000-4000-a000-000000000007','OPEN','Opening','opening_balance','posted');
      INSERT INTO ledger_entries(transaction_id,account_id,entry_side,amount) VALUES
        ('20000000-0000-4000-a000-000000000007','${debit}','credit',100),
        ('20000000-0000-4000-a000-000000000007','${credit}','credit',50);
    `);
    await db.exec(migration);
    initialized = true;
  }, 15_000);

  afterAll(async () => {
    await db.close();
  });

  async function createBatch(options: { approved?: boolean; amount?: number; expectedDebit?: number; owner?: string } = {}) {
    const batch = "20000000-0000-4000-a000-000000000010";
    const entry = "20000000-0000-4000-a000-000000000011";
    const amount = options.amount ?? 10;
    const expectedDebit = options.expectedDebit ?? 100;
    const hash = firstRow((await db.query<{ hash: string }>(
      "SELECT reconciliation_precondition_hash($1,$2,$3,$4,$5) AS hash",
      [debit, credit, amount, expectedDebit, 50]
    )).rows).hash;
    await db.query(`INSERT INTO financial_reconciliation_batches(
      id,batch_code,batch_type,investor_id,status,snapshot_at,snapshot_hash,description
    ) VALUES($1,'A-TEST','A',$2,'draft',now(),'snapshot','test')`, [batch, investor]);
    await db.query(`INSERT INTO financial_reconciliation_entries(
      id,batch_id,sequence_number,investor_id,settlement_id,source_transaction_id,
      debit_account_id,credit_account_id,amount,reason,idempotency_key,
      expected_debit_balance,expected_credit_balance,expected_debit_owner_type,expected_debit_owner_id,
      expected_credit_owner_type,expected_credit_owner_id,precondition_hash
    ) VALUES($1,$2,1,$3,$4,$5,$6,$7,$8,'verified correction','recon:test:1',$9,50,$10,$3,'investment_cycle',NULL,$11)`, [
      entry,batch,investor,settlement,sourceTransaction,debit,credit,amount,expectedDebit,options.owner ?? "investor",hash,
    ]);
    if (options.approved !== false) {
      await db.query("SELECT approve_financial_reconciliation_batch($1,$2)", [batch, admin]);
    }
    return { batch, entry };
  }

  it("posts a balanced approved correction with before and after snapshots", async () => {
    const { batch } = await createBatch();
    const result = await db.query<{ result: { postedCount: number } }>(
      "SELECT apply_financial_reconciliation_batch($1,$2) AS result", [batch, admin]
    );
    expect(firstRow(result.rows).result.postedCount).toBe(1);
    expect(firstRow((await db.query<{ b: string }>("SELECT reconciliation_account_balance($1) AS b", [debit])).rows).b).toBe("90.00");
    expect(firstRow((await db.query<{ b: string }>("SELECT reconciliation_account_balance($1) AS b", [credit])).rows).b).toBe("60.00");
    const verification = firstRow((await db.query<{ result: { postedCount: number; balancedLedgerCount: number } }>(
      "SELECT verify_financial_reconciliation_batch($1) AS result", [batch]
    )).rows).result;
    expect(verification).toMatchObject({ postedCount: 1, balancedLedgerCount: 1 });
  });

  it("is idempotent when an already completed batch is retried", async () => {
    const { batch } = await createBatch();
    await db.query("SELECT apply_financial_reconciliation_batch($1,$2)", [batch, admin]);
    const retried = firstRow((await db.query<{ result: { created: boolean } }>(
      "SELECT apply_financial_reconciliation_batch($1,$2) AS result", [batch, admin]
    )).rows).result;
    expect(retried.created).toBe(false);
    expect((await db.query("SELECT * FROM ledger_transactions WHERE source_type='financial_reconciliation'")).rows).toHaveLength(1);
  });

  it("rejects an unapproved batch", async () => {
    const { batch } = await createBatch({ approved: false });
    await expect(db.query("SELECT apply_financial_reconciliation_batch($1,$2)", [batch, admin]))
      .rejects.toThrow("requires explicit approval");
  });

  it("rejects approval of a batch with no pending entries", async () => {
    const batch = "20000000-0000-4000-a000-000000000020";
    await db.query(`INSERT INTO financial_reconciliation_batches(
      id,batch_code,batch_type,investor_id,status,snapshot_at,snapshot_hash,description
    ) VALUES($1,'A-EMPTY','A',$2,'draft',now(),'snapshot','empty')`, [batch, investor]);
    await expect(db.query("SELECT approve_financial_reconciliation_batch($1,$2)", [batch, admin]))
      .rejects.toThrow("contains no pending entries");
    expect(firstRow((await db.query<{ status: string }>(
      "SELECT status FROM financial_reconciliation_batches WHERE id=$1", [batch]
    )).rows).status).toBe("draft");
  });

  it("rejects changed balances and rolls the whole batch back", async () => {
    const { batch } = await createBatch({ expectedDebit: 99 });
    await expect(db.query("SELECT apply_financial_reconciliation_batch($1,$2)", [batch, admin]))
      .rejects.toThrow("balance precondition failed");
    expect(firstRow((await db.query<{ status: string }>("SELECT status FROM financial_reconciliation_batches WHERE id=$1", [batch])).rows).status).toBe("approved");
    expect((await db.query("SELECT * FROM ledger_transactions WHERE source_type='financial_reconciliation'")).rows).toHaveLength(0);
  });

  it("rejects an account ownership mismatch", async () => {
    const { batch } = await createBatch({ owner: "platform" });
    await expect(db.query("SELECT apply_financial_reconciliation_batch($1,$2)", [batch, admin]))
      .rejects.toThrow("account ownership precondition failed");
  });

  it("allows failure recovery only through an exact reversing entry", async () => {
    const { batch, entry } = await createBatch();
    await db.query("SELECT apply_financial_reconciliation_batch($1,$2)", [batch, admin]);
    const compensationBatch = "20000000-0000-4000-a000-000000000012";
    await db.query(`INSERT INTO financial_reconciliation_batches(
      id,batch_code,batch_type,investor_id,status,snapshot_at,snapshot_hash,description
    ) VALUES($1,'A-COMP','A',$2,'draft',now(),'snapshot','compensate')`, [compensationBatch,investor]);
    const hash = firstRow((await db.query<{ hash: string }>("SELECT reconciliation_precondition_hash($1,$2,10,60,90) AS hash", [credit,debit])).rows).hash;
    await db.query(`INSERT INTO financial_reconciliation_entries(
      batch_id,sequence_number,investor_id,debit_account_id,credit_account_id,amount,reason,idempotency_key,
      expected_debit_balance,expected_credit_balance,expected_debit_owner_type,expected_debit_owner_id,
      expected_credit_owner_type,expected_credit_owner_id,precondition_hash,compensation_of_entry_id
    ) VALUES($1,1,$2,$3,$4,10,'compensate','recon:test:comp',60,90,'investment_cycle',NULL,'investor',$2,$5,$6)`,
      [compensationBatch,investor,credit,debit,hash,entry]);
    await db.query("SELECT approve_financial_reconciliation_batch($1,$2)", [compensationBatch,admin]);
    await db.query("SELECT apply_financial_reconciliation_batch($1,$2)", [compensationBatch, admin]);
    expect(firstRow((await db.query<{ status: string }>("SELECT status FROM financial_reconciliation_entries WHERE id=$1", [entry])).rows).status).toBe("compensated");
    expect(firstRow((await db.query<{ b: string }>("SELECT reconciliation_account_balance($1) AS b", [debit])).rows).b).toBe("100.00");
  });

  it("keeps approved batch and entry evidence immutable", async () => {
    const { batch, entry } = await createBatch();
    await expect(db.query("UPDATE financial_reconciliation_entries SET amount=99 WHERE id=$1", [entry]))
      .rejects.toThrow("entry evidence is immutable");
    await expect(db.query("UPDATE financial_reconciliation_batches SET snapshot_hash='changed' WHERE id=$1", [batch]))
      .rejects.toThrow("batch evidence is immutable");
    await expect(db.query("DELETE FROM financial_reconciliation_entries WHERE id=$1", [entry]))
      .rejects.toThrow("entries are immutable");
  });

  it("requires draft creation and the controlled approval function", async () => {
    await expect(db.query(`INSERT INTO financial_reconciliation_batches(
      batch_code,batch_type,status,snapshot_at,snapshot_hash,description,approved_by,approved_at
    ) VALUES('A-FORGED','A','approved',now(),'snapshot','forged',$1,now())`, [admin]))
      .rejects.toThrow("must be created as unapproved drafts");
  });
});
