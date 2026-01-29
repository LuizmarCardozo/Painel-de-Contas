// public/app.js
import {
  addBill,
  updateBill,
  deleteBill,
  getBill,
  markPaidThisCycle,
  listBills,
  replaceAllBills,
} from "./db.js";

// ---- DOM ----
const views = {
  dashboard: document.querySelector("#view-dashboard"),
  nova: document.querySelector("#view-nova"),
};

const tabDashboard = document.querySelector("#tab-dashboard");
const tabNova = document.querySelector("#tab-nova");

const soonDaysInput = document.querySelector("#soonDays");
const soonDaysLabel = document.querySelector("#soon-days-label");

const listOverdue = document.querySelector("#list-overdue");
const listSoon = document.querySelector("#list-soon");
const listPaid = document.querySelector("#list-paid");

const billForm = document.querySelector("#billForm");
const btnReset = document.querySelector("#btn-reset");

// CRUD (aba cadastro)
const listManage = document.querySelector("#list-manage");
const manageEmpty = document.querySelector("#manage-empty");
const btnSubmit = document.querySelector("#btn-submit");
const btnCancelEdit = document.querySelector("#btn-cancel-edit");

const btnExport = document.querySelector("#btn-export");
const fileImport = document.querySelector("#file-import");

// ---- Helpers ----
function pad(n) {
  return String(n).padStart(2, "0");
}

function currentCycle(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function dueDateForCycle(dueDay, base = new Date()) {
  const y = base.getFullYear();
  const m = base.getMonth();
  const dim = daysInMonth(y, m);
  const safeDay = Math.min(Math.max(1, Number(dueDay)), dim);
  return new Date(y, m, safeDay, 0, 0, 0, 0);
}

function moneyBR(v) {
  return (Number(v) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getFormValues() {
  const fd = new FormData(billForm);
  return {
    id: String(fd.get("id") || "").trim(),
    title: String(fd.get("title") || "").trim(),
    amount: Number(fd.get("amount") || 0),
    issueDay: Number(fd.get("issueDay")),
    dueDay: Number(fd.get("dueDay")),
    remindDays: Math.max(0, Number(fd.get("remindDays") || 0)),
  };
}

function validateBill(values) {
  if (!values.title) return "Informe uma descrição.";
  if (
    !Number.isFinite(values.issueDay) ||
    values.issueDay < 1 ||
    values.issueDay > 31
  )
    return "Dia de emissão inválido (1 a 31).";
  if (
    !Number.isFinite(values.dueDay) ||
    values.dueDay < 1 ||
    values.dueDay > 31
  )
    return "Dia de vencimento inválido (1 a 31).";
  if (!Number.isFinite(values.amount) || values.amount < 0)
    return "Valor inválido.";
  return null;
}

// ---- Routing ----
function setRoute() {
  const hash = location.hash || "#/dashboard";
  const route = hash.replace("#/", "");

  Object.values(views).forEach((v) => v.classList.remove("active"));
  [tabDashboard, tabNova].forEach((t) => t.classList.remove("active"));

  if (route === "nova") {
    views.nova.classList.add("active");
    tabNova.classList.add("active");
  } else {
    views.dashboard.classList.add("active");
    tabDashboard.classList.add("active");
  }
}

window.addEventListener("hashchange", async () => {
  setRoute();
  const route = location.hash || "#/dashboard";
  if (route === "#/dashboard") await loadDashboard();
  if (route === "#/nova") await loadManageList();
});

// ---- Render Dashboard ----
function renderItemDashboard(bill, { showPayButton, cycle }) {
  const li = document.createElement("li");
  li.className = "item";

  const left = document.createElement("div");
  const title = document.createElement("div");
  title.textContent = bill.title || "(sem título)";

  const meta = document.createElement("div");
  meta.className = "muted";
  meta.textContent = `${moneyBR(bill.amount)} • vence dia ${bill.dueDay} (mês atual)`;

  left.appendChild(title);
  left.appendChild(meta);

  const right = document.createElement("div");
  right.style.display = "flex";
  right.style.gap = "8px";
  right.style.alignItems = "center";

  const paidThisCycle = bill.lastPaidCycle === cycle;

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = paidThisCycle ? "Paga (este mês)" : "Aberta";
  right.appendChild(badge);

  if (showPayButton && !paidThisCycle) {
    const btn = document.createElement("button");
    btn.textContent = "Confirmar pagamento";
    btn.className = "ghost";
    btn.addEventListener("click", async () => {
      await markPaidThisCycle(bill.id, cycle);
      await loadDashboard();
      await loadManageList(); // mantém lista do cadastro atualizada também
    });
    right.appendChild(btn);
  }

  li.appendChild(left);
  li.appendChild(right);
  return li;
}

async function loadDashboard() {
  const soonDays = Math.max(0, Number(soonDaysInput?.value || 0));
  if (soonDaysLabel) soonDaysLabel.textContent = String(soonDays);

  listOverdue.innerHTML = "";
  listSoon.innerHTML = "";
  listPaid.innerHTML = "";

  const bills = await listBills();

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const cycle = currentCycle(now);
  const soonLimit = new Date(today.getTime() + soonDays * 86400000);

  let anyOverdue = false;
  let anySoon = false;
  let anyPaid = false;

  for (const bill of bills) {
    const due = dueDateForCycle(bill.dueDay, now);
    const paidThisCycle = bill.lastPaidCycle === cycle;

    if (paidThisCycle) {
      anyPaid = true;
      listPaid.appendChild(
        renderItemDashboard(bill, { showPayButton: false, cycle }),
      );
      continue;
    }

    const isOverdue = due < today;
    const isSoon = due >= today && due <= soonLimit;

    if (isOverdue) {
      anyOverdue = true;
      listOverdue.appendChild(
        renderItemDashboard(bill, { showPayButton: true, cycle }),
      );
    } else if (isSoon) {
      anySoon = true;
      listSoon.appendChild(
        renderItemDashboard(bill, { showPayButton: true, cycle }),
      );
    }
  }

  if (!anyOverdue)
    listOverdue.innerHTML = `<li class="muted">Nada vencido 🎉</li>`;
  if (!anySoon)
    listSoon.innerHTML = `<li class="muted">Nada a vencer nesse intervalo.</li>`;
  if (!anyPaid)
    listPaid.innerHTML = `<li class="muted">Ainda sem histórico.</li>`;
}

// ---- CRUD: Aba Cadastro (Listar / Editar / Apagar) ----
function setEditMode(isEdit) {
  if (btnSubmit) btnSubmit.textContent = isEdit ? "Atualizar" : "Salvar";
  if (btnCancelEdit) btnCancelEdit.hidden = !isEdit;
}

function clearForm() {
  billForm.reset();
  // zera o hidden id
  const idField = billForm.querySelector('input[name="id"]');
  if (idField) idField.value = "";
  setEditMode(false);
}

function renderManageItem(bill) {
  const li = document.createElement("li");
  li.className = "item";

  const left = document.createElement("div");
  const title = document.createElement("div");
  title.textContent = bill.title || "(sem título)";

  const meta = document.createElement("div");
  meta.className = "muted";
  meta.textContent = `${moneyBR(bill.amount)} • emissão dia ${bill.issueDay} • vence dia ${bill.dueDay} • lembrar ${bill.remindDays ?? 0}d`;

  left.appendChild(title);
  left.appendChild(meta);

  const right = document.createElement("div");
  right.style.display = "flex";
  right.style.gap = "8px";
  right.style.alignItems = "center";

  const btnEdit = document.createElement("button");
  btnEdit.className = "ghost";
  btnEdit.textContent = "Editar";
  btnEdit.addEventListener("click", async () => {
    const b = await getBill(bill.id);
    if (!b) return;

    // preenche form
    billForm.querySelector('input[name="id"]').value = String(b.id);
    billForm.querySelector('input[name="title"]').value = b.title ?? "";
    billForm.querySelector('input[name="amount"]').value = String(
      b.amount ?? 0,
    );
    billForm.querySelector('input[name="issueDay"]').value = String(
      b.issueDay ?? 1,
    );
    billForm.querySelector('input[name="dueDay"]').value = String(
      b.dueDay ?? 1,
    );
    billForm.querySelector('input[name="remindDays"]').value = String(
      b.remindDays ?? 0,
    );

    setEditMode(true);
    // opcional: sobe a tela pro form
    billForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const btnDel = document.createElement("button");
  btnDel.className = "ghost";
  btnDel.textContent = "Apagar";
  btnDel.addEventListener("click", async () => {
    const ok = confirm(`Apagar "${bill.title}"?`);
    if (!ok) return;
    await deleteBill(bill.id);
    await loadManageList();
    await loadDashboard();
    // se estava editando essa conta, limpa o form
    const currentId = billForm.querySelector('input[name="id"]')?.value;
    if (currentId && Number(currentId) === Number(bill.id)) clearForm();
  });

  right.appendChild(btnEdit);
  right.appendChild(btnDel);

  li.appendChild(left);
  li.appendChild(right);
  return li;
}

async function loadManageList() {
  if (!listManage) return;

  listManage.innerHTML = "";
  const bills = await listBills();

  if (!bills.length) {
    if (manageEmpty) manageEmpty.style.display = "block";
    return;
  }
  if (manageEmpty) manageEmpty.style.display = "none";

  for (const bill of bills) {
    listManage.appendChild(renderManageItem(bill));
  }
}

// ---- Form submit: cria OU atualiza ----
billForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const values = getFormValues();
  const err = validateBill(values);
  if (err) return alert(err);

  if (values.id) {
    // UPDATE
    await updateBill(values.id, {
      title: values.title,
      amount: values.amount,
      issueDay: values.issueDay,
      dueDay: values.dueDay,
      remindDays: values.remindDays,
    });
    clearForm();
  } else {
    // CREATE
    await addBill(values);
    billForm.reset();
  }

  await loadManageList();
  await loadDashboard();
});

btnReset?.addEventListener("click", clearForm);

btnCancelEdit?.addEventListener("click", () => {
  clearForm();
});

// ---- Backup ----
btnExport?.addEventListener("click", async () => {
  const bills = await listBills();
  const payload = { exportedAt: new Date().toISOString(), bills };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `contas-backup-${ymd(new Date())}.json`;
  a.click();

  URL.revokeObjectURL(url);
});

fileImport?.addEventListener("change", async () => {
  const file = fileImport.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data?.bills || !Array.isArray(data.bills)) {
      alert("Arquivo inválido (esperado: { bills: [...] }).");
      return;
    }

    await replaceAllBills(data.bills);
    alert("Importado com sucesso ✅");

    await loadDashboard();
    await loadManageList();
  } catch (err) {
    console.error(err);
    alert("Falha ao importar. O arquivo está corrompido?");
  } finally {
    fileImport.value = "";
  }
});

// ---- Boot ----
(function boot() {
  setRoute();
  loadDashboard();
  loadManageList();
})();
