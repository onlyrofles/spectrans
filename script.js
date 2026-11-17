(function () {
  'use strict';

  var WHATSAPP_PHONE = '77027578989'; // ИП «СпецТранс», +7 702 757 89 89
  var MAX_QTY = 10;

  var F = window.Fleet;
  var fleet = F.load();
  var activeCat = 'all';
  var picked = []; // [{ id, qty }] in the order the client added them

  function $(id) { return document.getElementById(id); }
  function byId(id) { return fleet.filter(function (e) { return e.id === id; })[0] || null; }
  function pickedQty(id) { var p = picked.filter(function (x) { return x.id === id; })[0]; return p ? p.qty : 0; }

  F.hydrateIcons();

  // ---------- Catalog ----------
  function badge(status) {
    var ic = status === 'free' ? 'checkCircle' : status === 'busy' ? 'clock' : 'info';
    return '<span class="status status--' + status + '">' + F.icon(ic) + F.STATUS[status].label + '</span>';
  }

  function priceHtml(e) {
    return (e.price ? '<b>' + F.money(e.price) + '</b> /мес' : '<b class="is-ask">Цена по запросу</b>') +
      ' <span>· мин. срок — ' + e.minMonths + ' мес.</span>';
  }

  function card(e) {
    var busy = e.status === 'busy';
    var inOrder = pickedQty(e.id) > 0;
    var btn = busy
      ? '<button type="button" class="btn btn--muted btn--block" disabled>Сейчас в работе</button>'
      : inOrder
        ? '<button type="button" class="btn btn--dark btn--block" data-toggle="' + e.id + '">В заявке ' + F.icon('check') + '</button>'
        : '<button type="button" class="btn btn--accent btn--block" data-toggle="' + e.id + '">' + F.icon('plus') + ' В заявку</button>';
    return '<article class="unit' + (busy ? ' is-busy' : '') + (inOrder ? ' is-selected' : '') + '">' +
      '<div class="unit__photo">' + F.photoHtml(e, 'unit__img') +
        (inOrder ? '<span class="unit__picked">' + F.icon('check') + 'В заявке</span>' : '') + '</div>' +
      '<div class="unit__body">' +
        '<div class="unit__title"><h3>' + F.esc(e.name) + '</h3>' + badge(e.status) + '</div>' +
        (e.specs.length ? '<ul class="unit__specs">' + e.specs.map(function (s) { return '<li>' + F.esc(s) + '</li>'; }).join('') + '</ul>' : '') +
        '<p class="unit__price">' + priceHtml(e) + '</p>' +
        btn +
      '</div></article>';
  }

  function catsWithItems() {
    return F.CATEGORIES.filter(function (c) { return fleet.some(function (e) { return e.cat === c.id; }); });
  }

  function renderChips() {
    // Hide categories the owner has emptied
    if (activeCat !== 'all' && !catsWithItems().some(function (c) { return c.id === activeCat; })) activeCat = 'all';
    var items = [{ id: 'all', name: 'Вся техника', n: fleet.length }].concat(catsWithItems().map(function (c) {
      return { id: c.id, name: c.name, n: fleet.filter(function (e) { return e.cat === c.id; }).length };
    }));
    $('chips').innerHTML = items.map(function (c) {
      return '<button type="button" class="chip' + (c.id === activeCat ? ' is-active' : '') + '" data-cat="' + c.id + '">' +
        c.name + ' <span>' + c.n + '</span></button>';
    }).join('');
  }

  function renderFleet() {
    var cats = activeCat === 'all' ? catsWithItems() : [F.category(activeCat)];
    $('fleet').innerHTML = cats.map(function (c) {
      var list = fleet.filter(function (e) { return e.cat === c.id; });
      return (activeCat === 'all' ? '<h3 class="fleet__group">' + c.name + ' <span>' + list.length + '</span></h3>' : '') +
        '<div class="fleet">' + list.map(card).join('') + '</div>';
    }).join('');
  }

  $('chips').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-cat]');
    if (!b) return;
    activeCat = b.getAttribute('data-cat');
    renderChips();
    renderFleet();
  });

  $('fleet').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-toggle]');
    if (!b) return;
    var id = b.getAttribute('data-toggle');
    if (pickedQty(id)) removeItem(id); else addItem(id);
  });

  // ---------- Order list ----------
  function addItem(id) {
    var e = byId(id);
    if (!e || e.status === 'busy' || pickedQty(id)) return;
    picked.push({ id: id, qty: 1 });
    setError('picked', '');
    renderAll();
  }

  function removeItem(id) {
    picked = picked.filter(function (x) { return x.id !== id; });
    renderAll();
  }

  function setQty(id, qty) {
    picked.forEach(function (x) { if (x.id === id) x.qty = Math.max(1, Math.min(MAX_QTY, qty)); });
    renderAll();
  }

  function renderPicked() {
    $('picked').innerHTML = picked.length ? picked.map(function (p) {
      var e = byId(p.id);
      return '<li class="picked__item">' +
        '<span class="picked__thumb">' + F.photoHtml(e, 'picked__img') + '</span>' +
        '<span class="picked__name">' + F.esc(e.name) + '<small>' + (e.price ? F.money(e.price) + ' /мес' : 'Цена по запросу') + '</small></span>' +
        '<span class="qty" role="group" aria-label="Количество">' +
          '<button type="button" data-qty="' + p.id + '" data-step="-1" aria-label="Меньше">' + F.icon('minus') + '</button>' +
          '<b>' + p.qty + '</b>' +
          '<button type="button" data-qty="' + p.id + '" data-step="1" aria-label="Больше">' + F.icon('plus') + '</button>' +
        '</span>' +
        '<button type="button" class="picked__remove" data-remove="' + p.id + '" aria-label="Убрать из заявки">' + F.icon('close') + '</button>' +
      '</li>';
    }).join('') : '<li class="picked__empty">Пока пусто — нажмите «В заявку» в каталоге или выберите технику ниже.</li>';

    $('addSelect').innerHTML = '<option value="">+ Добавить технику…</option>' + catsWithItems().map(function (c) {
      return '<optgroup label="' + c.name + '">' + fleet.filter(function (e) { return e.cat === c.id; }).map(function (e) {
        var off = e.status === 'busy' || pickedQty(e.id);
        return '<option value="' + e.id + '"' + (off ? ' disabled' : '') + '>' + F.esc(e.name) +
          (e.status === 'busy' ? ' — в работе' : pickedQty(e.id) ? ' — в заявке' : '') + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
  }

  $('picked').addEventListener('click', function (ev) {
    var q = ev.target.closest('[data-qty]');
    if (q) { setQty(q.getAttribute('data-qty'), pickedQty(q.getAttribute('data-qty')) + Number(q.getAttribute('data-step'))); return; }
    var r = ev.target.closest('[data-remove]');
    if (r) removeItem(r.getAttribute('data-remove'));
  });

  $('addSelect').addEventListener('change', function (ev) {
    if (ev.target.value) addItem(ev.target.value);
  });

  // ---------- Calculation ----------
  function pay() { return document.querySelector('input[name="pay"]:checked').value; }

  function calc() {
    var items = picked.map(function (p) { return { e: byId(p.id), qty: p.qty }; });
    var minReq = items.reduce(function (m, x) { return Math.max(m, x.e.minMonths); }, 1);
    var typed = parseInt($('months').value, 10);
    if (isNaN(typed) || typed < 1) typed = 1;
    if (typed > 24) typed = 24;
    var m = Math.max(typed, minReq);
    var known = 0, unknown = 0;
    items.forEach(function (x) {
      x.sum = x.e.price ? x.e.price * x.qty * m : null;
      if (x.sum === null) unknown++; else known += x.sum;
    });
    return { items: items, months: m, typed: typed, minReq: minReq, known: known, unknown: unknown };
  }

  function update() {
    var c = calc();
    var rows = c.items.map(function (x) {
      return '<div><dt>' + F.esc(x.e.name) + (x.qty > 1 ? ' × ' + x.qty : '') + '</dt><dd>' + (x.sum === null ? 'по запросу' : F.money(x.sum)) + '</dd></div>';
    });
    if (!rows.length) {
      $('rows').innerHTML = '<div class="summary__empty">Добавьте технику из каталога — здесь появится расчёт.</div>';
    } else {
      $('rows').innerHTML = rows.join('') +
        '<div class="summary__gap"><dt>Срок аренды</dt><dd>' + F.months(c.months) + '</dd></div>' +
        '<div><dt>Оператор</dt><dd>включён</dd></div>' +
        '<div><dt>Доставка на объект</dt><dd>' + ($('delivery').checked ? 'по договорённости' : 'не нужна') + '</dd></div>' +
        '<div><dt>Оплата</dt><dd>' + pay().toLowerCase() + '</dd></div>';
    }

    var total = $('total');
    if (!c.items.length) total.textContent = '—';
    else if (!c.unknown) total.textContent = F.money(c.known);
    else total.textContent = c.known ? 'от ' + F.money(c.known) : 'По запросу';
    total.classList.toggle('is-text', !!c.unknown && !c.known);

    var notes = [];
    if (c.typed < c.minReq) notes.push('Минимальный срок аренды для выбранной техники — ' + F.months(c.minReq) + '. Расчёт выполнен с учётом минимального срока.');
    var confirm = c.items.filter(function (x) { return x.e.status === 'confirm'; }).map(function (x) { return F.esc(x.e.name); });
    if (confirm.length) notes.push('Наличие уточнит менеджер: ' + confirm.join(', ') + '.');
    $('notice').hidden = !notes.length;
    $('noticeText').innerHTML = notes.join('<br>');
    $('months').min = c.minReq;
  }

  ['months', 'delivery'].forEach(function (id) {
    $(id).addEventListener('input', update);
    $(id).addEventListener('change', update);
  });
  document.querySelectorAll('input[name="pay"]').forEach(function (r) { r.addEventListener('change', update); });

  // ---------- Submit: validate, then open a prepared WhatsApp message ----------
  function setError(field, msg) {
    var el = document.querySelector('[data-err="' + field + '"]');
    if (el) el.textContent = msg || '';
    var input = $(field);
    var box = input && input.closest('.input');
    if (box) box.classList.toggle('is-invalid', !!msg);
    return !msg;
  }

  $('orderForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var c = calc();
    var ok = setError('picked', c.items.length ? '' : 'Добавьте хотя бы одну единицу техники');
    ok = setError('address', $('address').value.trim() ? '' : 'Укажите объект или регион') && ok;
    ok = setError('name', $('name').value.trim() ? '' : 'Укажите имя') && ok;
    if (!ok) {
      var bad = document.querySelector('.is-invalid, .field__error:not(:empty)');
      if (bad) bad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    var total = !c.unknown ? F.money(c.known) : c.known ? 'от ' + F.money(c.known) + ' (часть позиций по запросу)' : 'по запросу';
    var lines = ['Заявка на аренду спецтехники', '', 'Техника:'];
    c.items.forEach(function (x) {
      lines.push('• ' + x.e.name + ' × ' + x.qty + (x.e.status === 'confirm' ? ' (уточнить наличие)' : ''));
    });
    lines.push(
      '',
      'Срок аренды: ' + F.months(c.months),
      'Объект: ' + $('address').value.trim(),
      'Доставка на объект: ' + ($('delivery').checked ? 'нужна' : 'не нужна'),
      'Оплата: ' + pay().toLowerCase(),
      'Примерная стоимость: ' + total,
      '',
      'Имя: ' + $('name').value.trim()
    );
    var company = $('company').value.trim();
    if (company) lines.push('Компания: ' + company);
    var comment = $('comment').value.trim();
    if (comment) lines.push('Комментарий: ' + comment);

    window.open('https://wa.me/' + WHATSAPP_PHONE + '?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');

    var st = $('status');
    st.hidden = false;
    st.textContent = 'Открылся WhatsApp с готовой заявкой. Нажмите «Отправить», и менеджер свяжется с вами.';
  });

  ['address', 'name'].forEach(function (id) {
    $(id).addEventListener('input', function () { setError(id, ''); });
  });

  // ---------- Render and live updates from the owner panel ----------
  function renderAll() {
    renderChips();
    renderFleet();
    renderPicked();
    update();
  }

  function refresh() {
    fleet = F.load();
    // Drop machines the owner has just marked as busy
    picked = picked.filter(function (p) { var e = byId(p.id); return e && e.status !== 'busy'; });
    $('statMin').textContent = 'от ' + Math.min.apply(null, fleet.map(function (e) { return e.minMonths; })) + ' мес.';
    renderAll();
  }
  F.onChange(refresh);

  refresh();
})();
