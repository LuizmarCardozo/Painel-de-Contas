# Minhas Contas 

App simples para gerenciar contas (vencidas / a vencer / pagas) com **HTML, CSS e JavaScript**, visual responsivo (PC e mobile), com **armazenamento local** via **IndexedDB** (Dexie).  
O usuário pode **instalar como PWA** (opcional) e o app funciona **offline** (cache + dados locais).

> Tema visual: “Subaru Blue”.

---

## ✅ Funcionalidades

- **Dashboard**
  - Contas **vencidas**
  - Contas **prestes a vencer** (filtro por dias configurável)
  - Contas **pagas (histórico)**

- **Cadastro de Contas (CRUD)**
  - **Criar**
  - **Listar**
  - **Editar**
  - **Apagar**
  - “Confirmar pagamento” marca como paga **somente no mês atual**

- **Modelo de conta mensal (por dia do mês)**
  - Cadastro usa apenas:
    - `Dia de emissão` (1–31)
    - `Dia de vencimento` (1–31)
  - O app calcula o vencimento no **mês atual**
  - Se o mês não tiver o dia (ex.: 31), usa o **último dia do mês**

- **Backup**
  - Exportar/Importar JSON das contas

- **PWA**
  - Prompt de instalação (quando suportado)
  - Offline com Service Worker

---

## 🧠 Como funciona o pagamento mensal

Como você escolhe apenas o **dia do vencimento**, cada conta é considerada **recorrente mensal**.

O app guarda um campo `lastPaidCycle` no formato `"YYYY-MM"`:
- Se `lastPaidCycle` == mês atual → aparece em **Pagas**
- Se não → aparece em **Aberta** (e pode virar vencida/a vencer conforme o dia)

---

## 📁 Estrutura do projeto

```

public/
index.html
styles.css
app.js
db.js
pwa.js
sw.js
manifest.webmanifest
icons/
icon-192.png
icon-512.png



---



## 🗃️ Dados e armazenamento

* Banco local: **IndexedDB**
* Wrapper: **Dexie**
* Os dados ficam **no dispositivo do usuário**.
* Para trocar de celular/computador: use **Exportar JSON** e **Importar JSON**.

---





## 📜 Licença

Sinta-se livre para usar/alterar. Se quiser, escolha uma licença (ex.: MIT) e adicione um `LICENSE`.

```
::contentReference[oaicite:0]{index=0}
```
