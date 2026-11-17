(function () {
  'use strict';

  // Demo password. Client-side check only: it is NOT real protection.
  // A production panel needs a server-side login.
  var DEMO_PIN = '1234';
  var SESSION_KEY = 'spectrans.owner';
  // Uploaded photos are cropped to 4:3 and stored as JPEG data URLs
  var PHOTO_W = 720, PHOTO_H = 540, PHOTO_QUALITY = 0.78;

  var F = window.Fleet;
  var fleet = F.load();
  var activeCat = 'all';

  function $(id) { return document.getElementById(id); }
  function byId(id) { return fleet.filter(function (x) { return x.id === id; })[0] || null; }
  F.hydrateIcons();

  // ---------- Login ----------
  function isLogged() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return false; }
  }

  function showDash(on) {
    $('login').hidden = on;
    $('dash').hidden = !on;
    $('logout').hidden = !on;
    if (on) render();
  }

  $('loginForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    if ($('pin').value === DEMO_PIN) {
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) { /* storage unavailable */ }
      $('pinError').textContent = '';
      showDash(true);
    } else {
      $('pinError').textContent = 'Неверный пароль';
      $('pin').closest('.input').classList.add('is-invalid');
    }
  });
  $('pin').addEventListener('input', function () {
    $('pinError').textContent = '';
    $('pin').closest('.input').classList.remove('is-invalid');
  });

  $('logout').addEventListener('click', function () {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* storage unavailable */ }
    $('pin').value = '';
    showDash(false);
  });

  // ---------- Dashboard ----------
  function renderCounters() {
    var n = { free: 0, busy: 0, confirm: 0 };
    fleet.forEach(function (e) { n[e.status] += e.qty; }); // machines, not catalog positions
    $('counters').innerHTML = ['free', 'busy', 'confirm'].map(function (s) {
      return '<div class="counter counter--' + s + '"><b>' + n[s] + '</b><span>' + F.STATUS[s].label + '</span></div>';
    }).join('');
  }

  function renderChips() {
    var items = [{ id: 'all', name: 'Вся техника', n: fleet.length }].concat(F.CATEGORIES.map(function (c) {
      return { id: c.id, name: c.name, n: fleet.filter(function (e) { return e.cat === c.id; }).length };
    }));
    $('chips').innerHTML = items.map(function (c) {
      return '<button type="button" class="chip' + (c.id === activeCat ? ' is-active' : '') + '" data-cat="' + c.id + '">' +
        c.name + ' <span>' + c.n + '</span></button>';
    }).join('');
  }

  function settingCard(e) {
    return '<article class="panel setting" data-id="' + e.id + '">' +
      '<div class="setting__top">' + F.photoHtml(e, 'setting__img') +
        '<div class="setting__info"><p class="eyebrow eyebrow--small">' + F.category(e.cat).name + '</p><h3>' + F.esc(e.name) + '</h3>' +
          (e.specs.length ? '<p>' + F.esc(e.specs.join(' · ')) + '</p>' : '') + '</div>' +
        '<button type="button" class="icon-btn" data-edit="' + e.id + '" title="Редактировать" aria-label="Редактировать: ' + F.esc(e.name) + '">' + F.icon('pencil') + '</button>' +
      '</div>' +
      '<div class="setting__fields">' +
        '<label class="field field--wide"><span class="field__label">Цена за месяц</span>' +
          '<span class="input"><span class="input__prefix">₸</span><input type="number" min="0" step="10000" data-field="price" value="' + (e.price || '') + '" placeholder="по запросу" inputmode="numeric"></span></label>' +
        '<label class="field"><span class="field__label">Мин. срок, мес.</span>' +
          '<span class="input">' + F.icon('calendar') + '<input type="number" min="1" max="24" data-field="minMonths" value="' + e.minMonths + '" inputmode="numeric"></span></label>' +
        '<label class="field"><span class="field__label">Количество, шт.</span>' +
          '<span class="input">' + F.icon('garage') + '<input type="number" min="1" max="' + F.MAX_QTY + '" data-field="qty" value="' + e.qty + '" inputmode="numeric"></span></label>' +
      '</div>' +
      '<p class="field__label">Статус техники</p>' +
      '<div class="status-switch" role="radiogroup" aria-label="Статус: ' + F.esc(e.name) + '">' +
        ['free', 'busy', 'confirm'].map(function (s) {
          return '<button type="button" role="radio" aria-checked="' + (e.status === s) + '" class="status-switch__btn is-' + s + (e.status === s ? ' is-on' : '') + '" data-status="' + s + '">' + F.STATUS[s].label + '</button>';
        }).join('') +
      '</div>' +
    '</article>';
  }

  function render() {
    renderCounters();
    renderChips();
    var cats = activeCat === 'all'
      ? F.CATEGORIES.filter(function (c) { return fleet.some(function (e) { return e.cat === c.id; }); })
      : [F.category(activeCat)];
    var html = cats.map(function (c) {
      var list = fleet.filter(function (e) { return e.cat === c.id; });
      return '<h3 class="fleet__group">' + c.name + ' <span>' + list.length + '</span></h3>' +
        (list.length
          ? '<div class="settings">' + list.map(settingCard).join('') + '</div>'
          : '<div class="empty">В этой категории пока нет техники. <button type="button" class="btn btn--accent" data-add>' + F.icon('plus') + ' Добавить</button></div>');
    }).join('');
    $('settings').innerHTML = html || '<div class="empty">Парк пуст. <button type="button" class="btn btn--accent" data-add>' + F.icon('plus') + ' Добавить технику</button></div>';
  }

  $('chips').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-cat]');
    if (!b) return;
    activeCat = b.getAttribute('data-cat');
    render();
  });

  var toastTimer;
  function toast(msg, isError) {
    var t = $('toast');
    t.lastChild.textContent = ' ' + msg;
    t.classList.toggle('is-error', !!isError);
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2200);
  }

  // Save after a quick inline change; roll back if the browser storage is full
  function persist() {
    if (F.save(fleet)) { toast('Сохранено'); return; }
    toast('Не удалось сохранить: хранилище браузера переполнено', true);
    fleet = F.load();
    render();
  }

  function flash(id) {
    var card = document.querySelector('.setting[data-id="' + id + '"]');
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('is-flash');
    setTimeout(function () { card.classList.remove('is-flash'); }, 1800);
  }

  $('settings').addEventListener('click', function (ev) {
    var edit = ev.target.closest('[data-edit]');
    if (edit) { openEditor(edit.getAttribute('data-edit')); return; }
    if (ev.target.closest('[data-add]')) { openEditor(null); return; }
    var b = ev.target.closest('[data-status]');
    if (!b) return;
    var card = b.closest('[data-id]');
    var e = byId(card.getAttribute('data-id'));
    e.status = b.getAttribute('data-status');
    card.querySelectorAll('[data-status]').forEach(function (x) {
      var on = x === b;
      x.classList.toggle('is-on', on);
      x.setAttribute('aria-checked', on);
    });
    renderCounters();
    persist();
  });

  // Save numbers when the owner leaves the field (or presses Enter)
  $('settings').addEventListener('change', function (ev) {
    var input = ev.target.closest('[data-field]');
    if (!input) return;
    var e = byId(input.closest('[data-id]').getAttribute('data-id'));
    var field = input.getAttribute('data-field');
    var v = Math.round(Number(input.value));
    if (field === 'price') {
      v = v > 0 ? v : null; // empty or zero = price on request
      input.value = v || '';
    } else if (field === 'qty') {
      v = F.clampQty(v, e.qty);
      input.value = v;
    } else {
      v = Math.min(24, Math.max(1, v || e.minMonths));
      input.value = v;
    }
    e[field] = v;
    if (field === 'qty') renderCounters();
    persist();
  });

  // ---------- Add / edit dialog ----------
  var editor = $('editor');
  var editingId = null, draftPhoto = null;
  var delArmed = false, delTimer;

  $('fCat').innerHTML = F.CATEGORIES.map(function (c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('');
  $('fStatus').innerHTML = ['free', 'busy', 'confirm'].map(function (s) {
    return '<button type="button" role="radio" class="status-switch__btn is-' + s + '" data-fstatus="' + s + '">' + F.STATUS[s].label + '</button>';
  }).join('');

  function setStatusUI(s) {
    $('fStatus').querySelectorAll('[data-fstatus]').forEach(function (b) {
      var on = b.getAttribute('data-fstatus') === s;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', on);
    });
  }
  function currentStatus() {
    var b = $('fStatus').querySelector('.is-on');
    return b ? b.getAttribute('data-fstatus') : 'free';
  }
  $('fStatus').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-fstatus]');
    if (b) setStatusUI(b.getAttribute('data-fstatus'));
  });

  function renderPreview() {
    $('photoPreview').innerHTML = F.photoHtml({ photo: draftPhoto, name: $('fName').value || 'Фото техники' }, 'photo-field__img');
    $('photoRemove').hidden = !draftPhoto;
    $('photoBtnText').textContent = draftPhoto ? 'Заменить фото' : 'Загрузить фото';
  }

  function setNameError(msg) {
    $('fNameErr').textContent = msg;
    $('fName').closest('.input').classList.toggle('is-invalid', !!msg);
  }

  function disarmDelete() {
    delArmed = false;
    clearTimeout(delTimer);
    $('deleteBtn').classList.remove('is-armed');
    $('deleteBtn').querySelector('span').textContent = 'Удалить';
  }

  function openEditor(id) {
    var e = id ? byId(id) : null;
    editingId = e ? e.id : null;
    $('editorTitle').textContent = e ? 'Редактировать технику' : 'Новая техника';
    $('fCat').value = e ? e.cat : (activeCat !== 'all' ? activeCat : F.CATEGORIES[0].id);
    $('fName').value = e ? e.name : '';
    $('fSpecs').value = e ? e.specs.join(', ') : '';
    $('fPrice').value = e && e.price ? e.price : '';
    $('fMin').value = e ? e.minMonths : 1;
    $('fQty').value = e ? e.qty : 1;
    setStatusUI(e ? e.status : 'free');
    draftPhoto = e ? e.photo : null;
    $('photoInput').value = '';
    $('editorErr').textContent = '';
    setNameError('');
    disarmDelete();
    $('deleteBtn').hidden = !e;
    renderPreview();
    editor.showModal();
    $('fName').focus();
  }

  function closeEditor() {
    disarmDelete();
    editor.close();
  }

  // Close on the X / "Отмена" buttons and on a click outside the card
  editor.addEventListener('click', function (ev) {
    if (ev.target === editor || ev.target.closest('[data-close]')) closeEditor();
  });
  $('addBtn').addEventListener('click', function () { openEditor(null); });
  $('fName').addEventListener('input', function () { setNameError(''); });

  // Crop the picked image to 4:3 (center), scale to 720×540 and encode as JPEG
  function readPhoto(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { reject(new Error('type')); return; }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var sw = img.naturalWidth, sh = img.naturalHeight;
        var scale = Math.max(PHOTO_W / sw, PHOTO_H / sh);
        var cw = PHOTO_W / scale, ch = PHOTO_H / scale;
        var canvas = document.createElement('canvas');
        canvas.width = PHOTO_W;
        canvas.height = PHOTO_H;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, PHOTO_W, PHOTO_H);
        ctx.drawImage(img, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, PHOTO_W, PHOTO_H);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', PHOTO_QUALITY));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  $('photoInput').addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (!file) return;
    $('editorErr').textContent = '';
    readPhoto(file).then(function (dataUrl) {
      draftPhoto = dataUrl;
      renderPreview();
    }).catch(function () {
      $('editorErr').textContent = 'Не получилось открыть фото. Выберите файл JPG, PNG или WebP.';
    });
  });

  $('photoRemove').addEventListener('click', function () {
    draftPhoto = null;
    $('photoInput').value = '';
    renderPreview();
  });

  $('editorForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = $('fName').value.trim();
    if (!name) { setNameError('Укажите название'); $('fName').focus(); return; }
    var price = Math.round(Number($('fPrice').value));
    var item = F.cleanItem({
      id: editingId || F.newId(),
      cat: $('fCat').value,
      name: name,
      specs: $('fSpecs').value.split(','),
      photo: draftPhoto,
      price: price > 0 ? price : null,
      minMonths: Math.min(24, Math.max(1, Math.round(Number($('fMin').value)) || 1)),
      qty: F.clampQty($('fQty').value, 1),
      status: currentStatus()
    });
    var isEdit = !!(editingId && byId(editingId));
    var before = fleet.slice();
    fleet = isEdit
      ? fleet.map(function (x) { return x.id === editingId ? item : x; })
      : fleet.concat([item]);
    if (!F.save(fleet)) {
      fleet = before;
      $('editorErr').textContent = 'Не хватает места в хранилище браузера. Возьмите фото поменьше или удалите ненужные лоты.';
      return;
    }
    if (activeCat !== 'all' && activeCat !== item.cat) activeCat = item.cat;
    closeEditor();
    render();
    toast(isEdit ? 'Изменения сохранены' : 'Техника добавлена');
    flash(item.id);
  });

  // Delete needs a second click within 4 seconds
  $('deleteBtn').addEventListener('click', function () {
    if (!delArmed) {
      delArmed = true;
      this.classList.add('is-armed');
      this.querySelector('span').textContent = 'Точно удалить?';
      delTimer = setTimeout(disarmDelete, 4000);
      return;
    }
    var before = fleet.slice();
    fleet = fleet.filter(function (x) { return x.id !== editingId; });
    if (!F.save(fleet)) {
      fleet = before;
      $('editorErr').textContent = 'Не удалось сохранить изменения.';
      return;
    }
    closeEditor();
    render();
    toast('Техника удалена');
  });

  // ---------- Reset (also needs a second click) ----------
  var resetArmed = false, resetTimer;
  function disarmReset() {
    resetArmed = false;
    clearTimeout(resetTimer);
    $('resetBtn').classList.remove('is-armed');
    $('resetBtn').lastChild.textContent = ' Сбросить к исходным';
  }
  $('resetBtn').addEventListener('click', function () {
    if (!resetArmed) {
      resetArmed = true;
      this.classList.add('is-armed');
      this.lastChild.textContent = ' Точно сбросить? Добавленная техника удалится';
      resetTimer = setTimeout(disarmReset, 5000);
      return;
    }
    disarmReset();
    F.reset();
    fleet = F.load();
    activeCat = 'all';
    render();
    toast('Парк сброшен к исходному списку');
  });

  // If another tab changes the data, show the fresh values
  F.onChange(function () {
    fleet = F.load();
    if (!$('dash').hidden && !editor.open) render();
  });

  showDash(isLogged());
})();
