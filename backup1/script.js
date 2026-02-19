  const students = [];
  const tags = [];
  let roomConfig = { rows: 3, tablesPerRow: 4 };
  let lastSeating = null;
  const renamingIds = new Set();

  const el = (id) => document.getElementById(id);

  const tagColorPalette = [
    "#fee2e2", "#ffedd5", "#fef9c3", "#dcfce7", "#e0f2fe",
    "#f5d0fe", "#f9a8d4", "#fed7aa", "#bfdbfe", "#bbf7d0"
  ];

  function randomTagColor() {
    const idx = Math.floor(Math.random() * tagColorPalette.length);
    return tagColorPalette[idx];
  }

  function getTagById(id) {
    return tags.find((t) => t.id === id);
  }

  function updateCounts() {
    el("student-count-label").textContent = students.length + " Schüler";
    el("tag-count-label").textContent = tags.length + " Tags";
  }

  /* === Theme === */

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    el("theme-toggle-btn").textContent = theme === "dark" ? "☀️" : "🌙";
  }

  (function initTheme() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  })();

  /* === Schüler === */

  function addStudent() {
    const input = el("student-name-input");
    const name = input.value.trim();
    const errorEl = el("student-error");
    errorEl.textContent = "";

    if (!name || name.includes(" ")) {
      errorEl.textContent = "Bitte einen einzelnen Vornamen ohne Leerzeichen eingeben.";
      return;
    }
    if (students.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      errorEl.textContent = "Diesen Vornamen gibt es bereits.";
      return;
    }

    students.push({ id: crypto.randomUUID(), name, tagIds: [] });
    input.value = "";
    renderStudents();
    updateCounts();
  }

  function deleteStudent(id) {
    const idx = students.findIndex((s) => s.id === id);
    if (idx >= 0) {
      students.splice(idx, 1);
      renamingIds.delete(id);
      updateCounts();
      renderStudents();
      if (lastSeating) renderSeating(lastSeating);
    }
  }

  /* === Tags === */

  function addTag() {
    const input = el("tag-name-input");
    const name = input.value.trim();
    const errorEl = el("tag-error");
    errorEl.textContent = "";

    if (!name) {
      errorEl.textContent = "Tag-Name darf nicht leer sein.";
      return;
    }
    if (tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      errorEl.textContent = "Diesen Tag gibt es bereits.";
      return;
    }

    const colorInput = el("tag-color-input");
    const color = colorInput.value || randomTagColor();

    const properties = {
      frontOnly: el("prop-frontOnly").checked,
      cantShareTable: el("prop-cantShareTable").checked,
      mustWindow: el("prop-mustWindow").checked,
      mustDoor: el("prop-mustDoor").checked,
      backOnly: el("prop-backOnly").checked,
      middleOnly: el("prop-middleOnly").checked
    };

    tags.push({
      id: crypto.randomUUID(),
      name,
      color,
      hidden: false,
      properties
    });

    input.value = "";
    el("prop-frontOnly").checked = false;
    el("prop-cantShareTable").checked = false;
    el("prop-mustWindow").checked = false;
    el("prop-mustDoor").checked = false;
    el("prop-backOnly").checked = false;
    el("prop-middleOnly").checked = false;
    colorInput.value = "#ffffff";

    renderTags();
    renderStudents();
    updateCounts();
  }

  function removeTag(tagId) {
    const idx = tags.findIndex((t) => t.id === tagId);
    if (idx >= 0) {
      tags.splice(idx, 1);
      students.forEach((s) => {
        s.tagIds = s.tagIds.filter((id) => id !== tagId);
      });
      renderTags();
      renderStudents();
      updateCounts();
    }
  }

  function tagPropertiesToText(tag) {
    const p = tag.properties;
    const props = [];
    if (p.frontOnly) props.push("nur Reihe 1–2");
    if (p.cantShareTable) props.push("nicht gleicher Tisch");
    if (p.mustWindow) props.push("Nähe Fenster");
    if (p.mustDoor) props.push("Nähe Tür");
    if (p.backOnly) props.push("nur letzte Reihe");
    if (p.middleOnly) props.push("nur mittlere Tische");
    if (!props.length) return "keine speziellen Eigenschaften";
    return props.join(", ");
  }

  function renderTags() {
    const list = el("tag-list");
    const search = el("tag-search-input").value.trim().toLowerCase();
    list.innerHTML = "";

    tags
      .filter((tag) => tag.name.toLowerCase().includes(search))
      .forEach((tag) => {
        const div = document.createElement("div");
        div.className = "list-item";

        div.innerHTML = `
          <div>
            <div class="list-item-name">
              <span class="tag-color-dot" style="background:${tag.color}"></span>
              ${tag.name}
            </div>
            <div class="hint">${tagPropertiesToText(tag)}</div>
          </div>
          <div class="list-item-actions">
            <input type="color" value="${tag.color}" data-color="${tag.id}" title="Tag-Farbe ändern" />
            <button class="btn-outline" data-toggle-hidden="${tag.id}">
              ${tag.hidden ? "Einblenden" : "Ausblenden"}
            </button>
            <button class="btn-outline" data-remove="${tag.id}">✕</button>
          </div>
        `;
        list.appendChild(div);
      });

    list.querySelectorAll("input[data-color]").forEach((inp) => {
      inp.addEventListener("input", () => {
        const tag = getTagById(inp.dataset.color);
        if (!tag) return;
        tag.color = inp.value;
        renderTags();
        renderStudents();
        if (lastSeating) renderSeating(lastSeating);
      });
    });

    list.querySelectorAll("button[data-toggle-hidden]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tag = getTagById(btn.dataset.toggleHidden);
        if (!tag) return;
        tag.hidden = !tag.hidden;
        renderTags();
        renderStudents();
        if (lastSeating) renderSeating(lastSeating);
      });
    });

    list.querySelectorAll("button[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => removeTag(btn.dataset.remove));
    });
  }

  /* === Schülerliste / Edit === */

  function renderStudents() {
    const list = el("student-list");
    const search = el("student-search-input").value.trim().toLowerCase();
    const hideAllTags = el("toggle-hide-tags").checked;
    list.innerHTML = "";

    const filteredStudents = students.filter((s) =>
      s.name.toLowerCase().includes(search)
    );

    filteredStudents.forEach((student) => {
      const div = document.createElement("div");
      div.className = "list-item";

      const isRenaming = renamingIds.has(student.id);

      const assignedTags = student.tagIds
        .map((id) => getTagById(id))
        .filter(Boolean);

      const tagOptions = tags
        .map((t) => `<option value="${t.id}">${t.name}</option>`)
        .join("");

      div.innerHTML = `
        <div style="flex:1;min-width:120px;">
          <div class="list-item-name${isRenaming ? " rename-mode" : ""}">
            ${isRenaming
              ? `<input type="text" class="rename-field" value="${student.name}" />`
              : student.name
            }
          </div>
          <div class="list-item-tags">
            ${
              assignedTags.length && !hideAllTags
                ? assignedTags
                    .map(
                      (t) =>
                        `<span class="pill-tag ${t.hidden ? "hidden-tag" : ""}" data-tag-id="${t.id}" data-student-id="${student.id}" style="background:${t.color}">
                           <span class="tag-color-dot" style="background:${t.color}"></span>
                           ${t.name}
                         </span>`
                    )
                    .join("")
                : '<span class="hint">Keine sichtbaren Tags</span>'
            }
          </div>
        </div>
        <div class="list-item-actions">
          ${isRenaming
            ? `<button class="btn-primary" data-confirm-rename="${student.id}" title="Speichern">✓</button>
               <button class="btn-outline" data-cancel-rename="${student.id}" title="Abbrechen">✗</button>`
            : `<select class="tag-select">
                 <option value="">Tag wählen…</option>
                 ${tagOptions}
               </select>
               <button class="btn-outline" data-rename="${student.id}" title="Umbenennen">✏️</button>
               <button class="btn-danger" data-delete="${student.id}" title="Schüler löschen">🗑️</button>`
          }
        </div>
      `;

      if (isRenaming) {
        const input = div.querySelector(".rename-field");
        input.focus();
        input.select();

        const confirmRename = () => {
          const newName = input.value.trim();
          if (newName && !students.find(
            (s) => s.id !== student.id && s.name.toLowerCase() === newName.toLowerCase()
          )) {
            student.name = newName;
          }
          renamingIds.delete(student.id);
          renderStudents();
          if (lastSeating) renderSeating(lastSeating);
        };

        div.querySelector(`[data-confirm-rename]`).addEventListener("click", confirmRename);
        div.querySelector(`[data-cancel-rename]`).addEventListener("click", () => {
          renamingIds.delete(student.id);
          renderStudents();
        });
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") confirmRename();
          if (e.key === "Escape") {
            renamingIds.delete(student.id);
            renderStudents();
          }
        });
      } else {
        const select = div.querySelector("select.tag-select");
        select.addEventListener("change", () => {
          const tagId = select.value;
          if (!tagId) return;
          if (!student.tagIds.includes(tagId)) {
            student.tagIds.push(tagId);
            renderStudents();
          }
          select.value = "";
        });

        div.querySelector(`[data-rename]`).addEventListener("click", () => {
          renamingIds.add(student.id);
          renderStudents();
        });

        div.querySelector(`[data-delete]`).addEventListener("click", () => {
          deleteStudent(student.id);
        });
      }

      div.querySelectorAll(".pill-tag").forEach((span) => {
        span.addEventListener("click", () => {
          const sid = span.getAttribute("data-student-id");
          const tid = span.getAttribute("data-tag-id");
          const s = students.find((st) => st.id === sid);
          if (!s) return;
          s.tagIds = s.tagIds.filter((id) => id !== tid);
          renderStudents();
        });
      });

      list.appendChild(div);
    });
  }

  el("toggle-hide-tags").addEventListener("change", () => {
    renderStudents();
    if (lastSeating) renderSeating(lastSeating);
  });

  /* === Sitzlogik === */

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function generateSeats(rows, tablesPerRow) {
    const seats = [];
    for (let r = 0; r < rows; r++) {
      for (let t = 0; t < tablesPerRow; t++) {
        for (let s = 0; s < 2; s++) {
          seats.push({ row: r, tableIndex: t, seatIndex: s });
        }
      }
    }
    return seats;
  }

  function tableIdOfSeat(seat) {
    return seat.row + "-" + seat.tableIndex;
  }

  function violatesConstraints(student, seat, assignment) {
    const studentTags = student.tagIds.map(getTagById).filter(Boolean);
    const props = {
      frontOnly: studentTags.some((t) => t.properties.frontOnly),
      cantShareTable: studentTags.some((t) => t.properties.cantShareTable),
      mustWindow: studentTags.some((t) => t.properties.mustWindow),
      mustDoor: studentTags.some((t) => t.properties.mustDoor),
      backOnly: studentTags.some((t) => t.properties.backOnly),
      middleOnly: studentTags.some((t) => t.properties.middleOnly)
    };

    if (props.frontOnly && seat.row > 1) return true;
    if (props.backOnly && seat.row !== roomConfig.rows - 1) return true;

    if (props.middleOnly) {
      const leftMost = 0;
      const rightMost = roomConfig.tablesPerRow - 1;
      if (seat.tableIndex === leftMost || seat.tableIndex === rightMost) return true;
    }

    if (props.mustWindow) {
      const isFrontRow = seat.row === 0;
      const isOuterTable =
        seat.tableIndex === 0 || seat.tableIndex === roomConfig.tablesPerRow - 1;
      if (!(isFrontRow && isOuterTable)) return true;
    }

    if (props.mustDoor) {
      const isBackRow = seat.row === roomConfig.rows - 1;
      const isFirstTable = seat.tableIndex === 0;
      if (!(isBackRow && isFirstTable)) return true;
    }

    if (props.cantShareTable) {
      const table = tableIdOfSeat(seat);
      for (const otherId in assignment) {
        const otherSeat = assignment[otherId];
        if (!otherSeat) continue;
        if (tableIdOfSeat(otherSeat) === table) {
          const other = students.find((s) => s.id === otherId);
          if (!other) continue;
          const otherTags = other.tagIds.map(getTagById).filter(Boolean);
          const otherCantShare = otherTags.some((t) => t.properties.cantShareTable);
          if (otherCantShare) return true;
        }
      }
    }

    return false;
  }

  function computeAssignment() {
    const rows = roomConfig.rows;
    const tablesPerRow = roomConfig.tablesPerRow;
    const allSeats = generateSeats(rows, tablesPerRow);
    const seats = shuffleArray(allSeats);
    const shuffledStudents = shuffleArray(students);

    const assignment = {};
    const usedSeats = new Set();
    const unplaced = [];

    function backtrack(i) {
      if (i >= shuffledStudents.length) return true;
      const student = shuffledStudents[i];

      let placed = false;
      for (const seat of seats) {
        const key = seat.row + "-" + seat.tableIndex + "-" + seat.seatIndex;
        if (usedSeats.has(key)) continue;
        if (violatesConstraints(student, seat, assignment)) continue;

        assignment[student.id] = seat;
        usedSeats.add(key);
        placed = true;
        if (backtrack(i + 1)) return true;
        usedSeats.delete(key);
        assignment[student.id] = null;
      }

      if (!placed) {
        unplaced.push(student);
        return backtrack(i + 1);
      }
      return false;
    }

    backtrack(0);

    const freeSeats = allSeats.filter((seat) => {
      const key = seat.row + "-" + seat.tableIndex + "-" + seat.seatIndex;
      return !usedSeats.has(key);
    });
    const freeRandom = shuffleArray(freeSeats);
    let idx = 0;
    unplaced.forEach((s) => {
      if (idx < freeRandom.length) {
        assignment[s.id] = freeRandom[idx++];
      } else {
        assignment[s.id] = null;
      }
    });

    const fullySatisfied =
      Object.values(assignment).filter((v) => v === null).length === 0 &&
      unplaced.length === 0;

    return { assignment, satisfied: fullySatisfied };
  }

  function renderSeating(result) {
    lastSeating = result;
    const container = el("tables-container");
    container.innerHTML = "";

    const { assignment, satisfied } = result;
    const rows = roomConfig.rows;
    const tablesPerRow = roomConfig.tablesPerRow;
    const hideAllTags = el("toggle-hide-tags").checked;

    const seatMap = new Map();
    const unplacedStudents = [];

    students.forEach((s) => {
      const seat = assignment[s.id];
      if (!seat) {
        unplacedStudents.push(s);
        return;
      }
      const key = seat.row + "-" + seat.tableIndex + "-" + seat.seatIndex;
      seatMap.set(key, {
        student: s,
        tags: s.tagIds.map(getTagById).filter(Boolean),
        seat
      });
    });

    for (let r = 0; r < rows; r++) {
      const rowDiv = document.createElement("div");
      rowDiv.className = "table-row";

      for (let t = 0; t < tablesPerRow; t++) {
        const tableWrapper = document.createElement("div");
        tableWrapper.style.display = "flex";
        tableWrapper.style.flexDirection = "column";
        tableWrapper.style.alignItems = "center";

        const labelWrap = document.createElement("div");
        labelWrap.className = "table-label-wrapper";
        const label = document.createElement("div");
        label.className = "table-label";
        label.textContent = "Reihe " + (r + 1) + " · Tisch " + (t + 1);
        labelWrap.appendChild(label);

        const tableDiv = document.createElement("div");
        tableDiv.className = "table";

        for (let sIndex = 0; sIndex < 2; sIndex++) {
          const key = r + "-" + t + "-" + sIndex;
          const data = seatMap.get(key);
          const cell = document.createElement("div");
          cell.className = "seat-cell";

          const sideLabel = sIndex === 0 ? "links" : "rechts";
          const seatLabel = document.createElement("div");
          seatLabel.className = "seat-label";
          seatLabel.textContent = sideLabel;
          cell.appendChild(seatLabel);

          if (data) {
            const sDiv = document.createElement("div");
            sDiv.className = "seat-student";
            sDiv.textContent = data.student.name;
            cell.appendChild(sDiv);

            const tagsDiv = document.createElement("div");
            tagsDiv.className = "seat-tags";
            if (!hideAllTags) {
              data.tags.forEach((tObj) => {
                if (tObj.hidden) return;
                const span = document.createElement("span");
                span.className = "badge";
                span.style.background = tObj.color || "rgba(127,29,29,0.7)";
                span.textContent = tObj.name;
                tagsDiv.appendChild(span);
              });
            }
            cell.appendChild(tagsDiv);
          } else {
            const empty = document.createElement("div");
            empty.className = "hint";
            empty.textContent = "Leer";
            cell.appendChild(empty);
          }

          tableDiv.appendChild(cell);
        }

        tableWrapper.appendChild(labelWrap);
        tableWrapper.appendChild(tableDiv);
        rowDiv.appendChild(tableWrapper);
      }

      container.appendChild(rowDiv);
    }

    const status = el("status-label");
    if (students.length === 0) {
      status.textContent = "Keine Schüler vorhanden.";
    } else if (unplacedStudents.length > 0) {
      const names = unplacedStudents.map((s) => s.name).join(", ");
      status.textContent =
        "Nicht genug Plätze / Constraints für: " + names;
    } else if (satisfied) {
      status.textContent = "Alle Constraints konnten erfüllt werden.";
    } else {
      status.textContent = "Constraints teils verletzt, bestmögliche Zuordnung.";
    }
  }

  /* === Generieren / Reroll === */

  function generate() {
    const rows = parseInt(el("rows-input").value, 10) || 1;
    const tablesPerRow = parseInt(el("tables-input").value, 10) || 1;
    roomConfig.rows = Math.max(1, Math.min(10, rows));
    roomConfig.tablesPerRow = Math.max(1, Math.min(20, tablesPerRow));

    if (students.length === 0) {
      el("status-label").textContent = "Bitte erst Schüler anlegen.";
      el("tables-container").innerHTML = "";
      lastSeating = null;
      return;
    }

    const result = computeAssignment();
    renderSeating(result);
  }

  function reroll() {
    if (students.length === 0) return;
    generate();
  }

  /* === Events === */

  el("add-student-btn").addEventListener("click", addStudent);
  el("student-name-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addStudent();
  });

  el("add-tag-btn").addEventListener("click", addTag);
  el("tag-name-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTag();
  });

  el("random-color-btn").addEventListener("click", () => {
    el("tag-color-input").value = randomTagColor();
  });

  el("generate-btn").addEventListener("click", generate);
  el("reroll-btn").addEventListener("click", reroll);

  el("rows-input").addEventListener("change", () => {
    roomConfig.rows = parseInt(el("rows-input").value, 10) || 1;
  });
  el("tables-input").addEventListener("change", () => {
    roomConfig.tablesPerRow = parseInt(el("tables-input").value, 10) || 1;
  });

  el("student-search-input").addEventListener("input", renderStudents);
  el("tag-search-input").addEventListener("input", renderTags);

  el("theme-toggle-btn").addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });

  updateCounts();
