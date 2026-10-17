/* Amaranto Chocolates — tienda con pedido por WhatsApp. Sin dependencias. */
(function () {
  "use strict";

  var D = window.AMARANTO;
  var STORE_KEY = "amaranto-pedido-v1";
  var TAGS = { sinazucar: "Sin azúcar", vegano: "Vegano", singluten: "Sin gluten" };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var fmt = function (n) { return "$ " + n.toLocaleString("es-CL"); };
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  var BY_ID = {};
  D.productos.forEach(function (p) { BY_ID[p.id] = p; });

  // ---------- estado ----------
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem(STORE_KEY) || "[]").filter(function (l) { return BY_ID[l.id] && l.qty > 0; }); }
  catch (e) { cart = []; }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(cart)); } catch (e) { /* sin almacenamiento */ } }

  var state = { cat: "todo", tags: [] };

  // ---------- tienda ----------
  function renderTabs() {
    var tabs = $("[data-tabs]");
    [{ id: "todo", nombre: "Todo" }].concat(D.categorias).forEach(function (c) {
      var b = el("button", { type: "button", role: "tab", "class": "tab", "data-cat": c.id, "aria-selected": String(c.id === state.cat), text: c.nombre });
      b.addEventListener("click", function () { state.cat = c.id; syncFilters(); renderGrid(); });
      tabs.appendChild(b);
    });
    document.querySelectorAll("[data-chips] .chip").forEach(function (b) {
      b.addEventListener("click", function () {
        var t = b.getAttribute("data-tag"), i = state.tags.indexOf(t);
        if (i < 0) state.tags.push(t); else state.tags.splice(i, 1);
        syncFilters(); renderGrid();
      });
    });
  }
  function syncFilters() {
    document.querySelectorAll("[data-tabs] .tab").forEach(function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-cat") === state.cat)); });
    document.querySelectorAll("[data-chips] .chip").forEach(function (b) { b.setAttribute("aria-pressed", String(state.tags.indexOf(b.getAttribute("data-tag")) >= 0)); });
  }

  function visible(p) {
    if (state.cat !== "todo" && p.cat !== state.cat) return false;
    return state.tags.every(function (t) {
      return (p.tags || []).indexOf(t) >= 0 || (t === "sinazucar" && (p.opciones || []).indexOf("Sin azúcar") >= 0);
    });
  }

  function card(p) {
    var media = p.foto === false
      ? el("div", { "class": "ph", "aria-hidden": "true" }, [el("img", { src: "img/logo-vino.png", alt: "" })])
      : el("img", { src: "img/p/" + p.id + ".jpg", alt: p.nombre, loading: "lazy", width: "600", height: "600" });
    var sel = null;
    if (p.opciones) {
      sel = el("select", { "aria-label": "Chocolate para " + p.nombre });
      p.opciones.forEach(function (o) { sel.appendChild(el("option", { value: o, text: o })); });
    }
    var add = el("button", { type: "button", "class": "btn btn-wine btn-sm", text: "Agregar" });
    add.addEventListener("click", function () { addToCart(p.id, sel ? sel.value : ""); });
    var badges = (p.tags || []).map(function (t) { return el("span", { "class": "badge badge-" + t, text: TAGS[t] }); });
    return el("article", { "class": "card" + (p.destacado ? " card-feature" : "") }, [
      el("div", { "class": "card-media" }, [media, badges.length ? el("div", { "class": "badges" }, badges) : null]),
      el("div", { "class": "card-body" }, [
        el("h3", { text: p.nombre }),
        p.detalle ? el("p", { "class": "detalle", text: p.detalle }) : null,
        el("p", { "class": "desc", text: p.desc }),
        sel ? el("label", { "class": "opt-row" }, [el("span", { text: "Chocolate" }), sel]) : null,
        el("div", { "class": "card-foot" }, [el("span", { "class": "price", text: fmt(p.precio) }), add]),
        el("a", { "class": "sumar", href: D.sumar + p.id, target: "_blank", rel: "noopener", text: "Pagar con tarjeta en Sumar" })
      ])
    ]);
  }

  function renderGrid() {
    var grid = $("[data-grid]"); grid.textContent = "";
    var list = D.productos.filter(visible);
    list.forEach(function (p) { grid.appendChild(card(p)); });
    $("[data-empty-filter]").hidden = list.length > 0;
  }

  // ---------- pedido ----------
  var drawer = $("[data-drawer]"), scrim = $("[data-scrim]"), form = $("[data-form]"), lastFocus = null;
  function addToCart(id, opt) {
    var l = cart.find(function (x) { return x.id === id && x.opt === opt; });
    if (l) l.qty += 1; else cart.push({ id: id, opt: opt || "", qty: 1 });
    save(); renderCart();
    toast("Agregado: " + BY_ID[id].nombre + (opt ? " (" + opt + ")" : ""));
    var b = $(".cart-btn"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
  }
  function setQty(i, q) { if (q <= 0) cart.splice(i, 1); else cart[i].qty = q; save(); renderCart(); }
  function total() { return cart.reduce(function (s, l) { return s + BY_ID[l.id].precio * l.qty; }, 0); }

  function renderCart() {
    var count = cart.reduce(function (s, l) { return s + l.qty; }, 0);
    document.querySelectorAll("[data-cart-count]").forEach(function (n) { n.textContent = count; });
    var lines = $("[data-lines]"); lines.textContent = "";
    cart.forEach(function (l, i) {
      var p = BY_ID[l.id];
      var minus = el("button", { type: "button", "class": "qty-btn", "aria-label": "Quitar uno", text: "−" });
      var plus = el("button", { type: "button", "class": "qty-btn", "aria-label": "Agregar uno", text: "+" });
      minus.addEventListener("click", function () { setQty(i, l.qty - 1); });
      plus.addEventListener("click", function () { setQty(i, l.qty + 1); });
      lines.appendChild(el("li", { "class": "line" }, [
        el("div", { "class": "line-name" }, [el("span", { text: p.nombre + (p.detalle ? " · " + p.detalle : "") }), l.opt ? el("small", { text: l.opt }) : null]),
        el("div", { "class": "qty" }, [minus, el("span", { text: String(l.qty) }), plus]),
        el("span", { "class": "line-total", text: fmt(p.precio * l.qty) })
      ]));
    });
    $("[data-empty]").hidden = cart.length > 0;
    form.hidden = cart.length === 0;
    $("[data-total]").textContent = fmt(total());
  }

  function openCart() {
    lastFocus = document.activeElement; scrim.hidden = false;
    drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("locked"); drawer.focus();
  }
  function closeCart() {
    drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true");
    scrim.hidden = true; document.body.classList.remove("locked");
    if (lastFocus) lastFocus.focus();
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var nombre = form.nombre.value.trim(), err = $("[data-form-error]");
    err.hidden = !!nombre; err.textContent = nombre ? "" : "Escribe tu nombre.";
    if (!nombre) return;
    var out = ["Hola, Amaranto. Quiero hacer un pedido:", ""];
    cart.forEach(function (l) {
      var p = BY_ID[l.id];
      out.push("• " + l.qty + " × " + p.nombre + (p.detalle ? " (" + p.detalle + ")" : "") + (l.opt ? " — " + l.opt : "") + ": " + fmt(p.precio * l.qty));
    });
    out.push("", "Total: " + fmt(total()), "Nombre: " + nombre, "Entrega: " + form.entrega.value);
    var nota = form.nota.value.trim(); if (nota) out.push("Comentarios: " + nota);
    window.open("https://wa.me/" + D.whatsapp + "?text=" + encodeURIComponent(out.join("\n")), "_blank", "noopener");
  });
  $("[data-clear]").addEventListener("click", function () { cart = []; save(); renderCart(); });
  document.querySelectorAll("[data-open-cart]").forEach(function (b) { b.addEventListener("click", openCart); });
  $("[data-close-cart]").addEventListener("click", closeCart);
  scrim.addEventListener("click", closeCart);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && drawer.classList.contains("open")) closeCart(); });

  var toastEl = $("[data-toast]"), tt;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add("show"); clearTimeout(tt); tt = setTimeout(function () { toastEl.classList.remove("show"); }, 1800); }

  document.querySelector("[data-year]").textContent = new Date().getFullYear();
  document.querySelectorAll("[data-wa-direct]").forEach(function (a) {
    a.href = "https://wa.me/" + D.whatsapp + "?text=" + encodeURIComponent("Hola, Amaranto. Quería hacer una consulta.");
  });

  renderTabs();
  renderGrid();
  renderCart();
})();
