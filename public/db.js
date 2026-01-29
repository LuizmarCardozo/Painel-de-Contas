// public/db.js
export const db = new Dexie("contasDB");

// v2: modelo por dia do mês + pagamento por ciclo
db.version(2)
  .stores({
    bills: "++id, dueDay, createdAt",
  })
  .upgrade(async (tx) => {
    const table = tx.table("bills");
    const bills = await table.toArray();

    for (const b of bills) {
      const oldIssue = b.issueDate?.split?.("-")?.[2];
      const oldDue = b.dueDate?.split?.("-")?.[2];

      const issueDay = Number(b.issueDay ?? (oldIssue ? Number(oldIssue) : 1));
      const dueDay = Number(b.dueDay ?? (oldDue ? Number(oldDue) : 1));

      await table.update(b.id, {
        issueDay: Number.isFinite(issueDay) ? issueDay : 1,
        dueDay: Number.isFinite(dueDay) ? dueDay : 1,
        lastPaidCycle: b.lastPaidCycle ?? null,
        lastPaidAt: b.lastPaidAt ?? null,
      });
    }
  });

function clampDay(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 1;
  return Math.min(31, Math.max(1, x));
}

export async function addBill(bill) {
  return db.bills.add({
    title: String(bill.title || "").trim(),
    amount: Number(bill.amount || 0),
    issueDay: clampDay(bill.issueDay),
    dueDay: clampDay(bill.dueDay),
    remindDays: Math.max(0, Number(bill.remindDays || 0)),
    lastPaidCycle: null,
    lastPaidAt: null,
    createdAt: new Date().toISOString(),
  });
}

export async function updateBill(id, patch) {
  const update = {
    ...(patch.title !== undefined ? { title: String(patch.title).trim() } : {}),
    ...(patch.amount !== undefined
      ? { amount: Number(patch.amount || 0) }
      : {}),
    ...(patch.issueDay !== undefined
      ? { issueDay: clampDay(patch.issueDay) }
      : {}),
    ...(patch.dueDay !== undefined ? { dueDay: clampDay(patch.dueDay) } : {}),
    ...(patch.remindDays !== undefined
      ? { remindDays: Math.max(0, Number(patch.remindDays || 0)) }
      : {}),
  };
  return db.bills.update(Number(id), update);
}

export async function deleteBill(id) {
  return db.bills.delete(Number(id));
}

export async function markPaidThisCycle(id, cycle) {
  return db.bills.update(Number(id), {
    lastPaidCycle: cycle,
    lastPaidAt: new Date().toISOString(),
  });
}

export async function getBill(id) {
  return db.bills.get(Number(id));
}

export async function listBills() {
  return db.bills.orderBy("dueDay").toArray();
}

export async function replaceAllBills(bills) {
  return db.transaction("rw", db.bills, async () => {
    await db.bills.clear();
    await db.bills.bulkPut(bills);
  });
}
