/* Inventory Management — demo app front-end (vanilla JS) */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const tbody = $("#tbody");
  const txnBody = $("#txnBody");
  const searchInput = $("#search");
  const categoryFilter = $("#categoryFilter");

  let products = [];
  let editingId = null;
  let stockProductId = null;

  /* ---------- helpers ---------- */
  const api = async (path, options = {}) => {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const json = await res.json().catch(() => ({ ok: false, error: "Bad response" }));
    if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json.data;
  };

  let toastTimer;
  const toast = (message, isError = false) => {
    const el = $("#toast");
    el.textContent = message;
    el.classList.toggle("error", isError);
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  };

  const esc = (v) => {
    const div = document.createElement("div");
    div.textContent = v;
    return div.innerHTML;
  };

  const rupiah = (n) => "Rp " + Number(n).toLocaleString("id-ID");

  const fmtTime = (sqliteUtc) => {
    // SQLite datetime('now') is UTC — render local time
    const d = new Date(sqliteUtc.replace(" ", "T") + "Z");
    return d.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
  };

  /* ---------- rendering ---------- */
  function renderStats() {
    $("#statProducts").textContent = products.length;
    $("#statQty").textContent = products.reduce((sum, p) => sum + p.qty, 0);
    $("#statValue").textContent = rupiah(products.reduce((sum, p) => sum + p.qty * p.price, 0));
    $("#statLow").textContent = products.filter((p) => p.qty < 10).length;
  }

  function renderCategories() {
    const categories = [...new Set(products.map((p) => p.category))].sort();
    const current = categoryFilter.value;
    categoryFilter.innerHTML =
      '<option value="">All categories</option>' +
      categories.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
    categoryFilter.value = current;
    $("#categoryList").innerHTML = categories.map((c) => `<option value="${esc(c)}">`).join("");
  }

  function render() {
    const q = searchInput.value.trim().toLowerCase();
    const cat = categoryFilter.value;
    const rows = products.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) &&
        (!cat || p.category === cat)
    );

    tbody.innerHTML = rows
      .map((p) => {
        const qtyBadge =
          p.qty < 10
            ? `<span class="badge badge-red">${p.qty}</span>`
            : p.qty < 25
              ? `<span class="badge badge-yellow">${p.qty}</span>`
              : `<span class="badge badge-green">${p.qty}</span>`;
        return `
        <tr>
          <td class="mono">${esc(p.sku)}</td>
          <td>${esc(p.name)}</td>
          <td>${esc(p.category)}</td>
          <td class="num">${qtyBadge}</td>
          <td class="num">${rupiah(p.price)}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn-ghost btn-sm" data-stock="in" data-id="${p.id}">+ In</button>
              <button class="btn btn-ghost btn-sm" data-stock="out" data-id="${p.id}">− Out</button>
              <button class="btn btn-ghost btn-sm" data-edit="${p.id}">Edit</button>
              <button class="btn btn-danger btn-sm" data-del="${p.id}">Del</button>
            </div>
          </td>
        </tr>`;
      })
      .join("");
    $("#empty").hidden = rows.length > 0;
    renderStats();
  }

  function renderTransactions(txns) {
    txnBody.innerHTML = txns
      .map(
        (t) => `
        <tr>
          <td class="mono">${fmtTime(t.created_at)}</td>
          <td>${esc(t.product_name)} <span class="mono">${esc(t.sku)}</span></td>
          <td>${t.type === "in" ? '<span class="badge badge-green">IN</span>' : '<span class="badge badge-red">OUT</span>'}</td>
          <td class="num">${t.qty}</td>
          <td>${esc(t.note || "—")}</td>
        </tr>`
      )
      .join("");
    $("#txnEmpty").hidden = txns.length > 0;
  }

  async function load() {
    try {
      const data = await api(`/api/inventory/products?q=${encodeURIComponent(searchInput.value.trim())}`);
      products = data.products;
      renderCategories();
      render();
    } catch (err) {
      toast(err.message, true);
    }
    try {
      renderTransactions(await api("/api/inventory/transactions?limit=10"));
    } catch {
      /* transactions panel is secondary — ignore load failure */
    }
  }

  /* ---------- product modal ---------- */
  function openProductModal(product) {
    editingId = product ? product.id : null;
    $("#productModalTitle").textContent = product ? "Edit Product" : "Add Product";
    $("#pSku").value = product ? product.sku : "";
    $("#pName").value = product ? product.name : "";
    $("#pCategory").value = product ? product.category : "";
    $("#pPrice").value = product ? product.price : "";
    $("#productModal").classList.add("open");
    $("#pSku").focus();
  }

  const closeProductModal = () => $("#productModal").classList.remove("open");
  $("#btnAdd").addEventListener("click", () => openProductModal(null));
  $("#btnProductCancel").addEventListener("click", closeProductModal);
  $("#productModal").addEventListener("click", (e) => {
    if (e.target === $("#productModal")) closeProductModal();
  });

  $("#productForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      sku: $("#pSku").value.trim(),
      name: $("#pName").value.trim(),
      category: $("#pCategory").value.trim(),
      price: Number($("#pPrice").value),
    };
    $("#btnProductSave").disabled = true;
    try {
      if (editingId) {
        await api(`/api/inventory/products/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        toast("Product updated");
      } else {
        await api("/api/inventory/products", { method: "POST", body: JSON.stringify(payload) });
        toast("Product added — record a Stock In to fill its quantity");
      }
      closeProductModal();
      await load();
    } catch (err) {
      toast(err.message, true);
    } finally {
      $("#btnProductSave").disabled = false;
    }
  });

  /* ---------- stock modal ---------- */
  function openStockModal(product, type) {
    stockProductId = product.id;
    $("#sType").value = type;
    $("#stockModalTitle").textContent = type === "in" ? "Stock In" : "Stock Out";
    $("#stockProductLabel").textContent = `${product.sku} — ${product.name} (current: ${product.qty})`;
    $("#sQty").value = "";
    $("#sNote").value = "";
    $("#stockModal").classList.add("open");
    $("#sQty").focus();
  }

  const closeStockModal = () => $("#stockModal").classList.remove("open");
  $("#btnStockCancel").addEventListener("click", closeStockModal);
  $("#stockModal").addEventListener("click", (e) => {
    if (e.target === $("#stockModal")) closeStockModal();
  });

  $("#stockForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      type: $("#sType").value,
      qty: Number($("#sQty").value),
      note: $("#sNote").value.trim(),
    };
    $("#btnStockSave").disabled = true;
    try {
      const result = await api(`/api/inventory/products/${stockProductId}/stock`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast(`Recorded — new stock: ${result.product.qty}`);
      closeStockModal();
      await load();
    } catch (err) {
      toast(err.message, true);
    } finally {
      $("#btnStockSave").disabled = false;
    }
  });

  /* ---------- row actions (delegated) ---------- */
  document.querySelector("main").addEventListener("click", async (e) => {
    const stockBtn = e.target.closest("[data-stock]");
    const editBtn = e.target.closest("[data-edit]");
    const delBtn = e.target.closest("[data-del]");

    if (stockBtn) {
      const product = products.find((p) => p.id === Number(stockBtn.dataset.id));
      if (product) openStockModal(product, stockBtn.dataset.stock);
      return;
    }
    if (editBtn) {
      const product = products.find((p) => p.id === Number(editBtn.dataset.edit));
      if (product) openProductModal(product);
      return;
    }
    if (delBtn) {
      const id = Number(delBtn.dataset.del);
      const product = products.find((p) => p.id === id);
      if (!product) return;
      if (!confirm(`Delete product "${product.name}" and its transaction history?`)) return;
      try {
        await api(`/api/inventory/products/${id}`, { method: "DELETE" });
        toast("Product deleted");
        await load();
      } catch (err) {
        toast(err.message, true);
      }
    }
  });

  let searchTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 300);
  });
  categoryFilter.addEventListener("change", render);

  load();
})();
