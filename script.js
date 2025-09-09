if (sessionStorage.getItem("isLoggedIn") !== "true") { window.location.href = "./index.html"; }

document.addEventListener("DOMContentLoaded", () => {
    const el = {
        fileInput: document.getElementById("fileInput"), fileNameLabel: document.querySelector(".file-name"), reserveFP: document.getElementById("tutorFirstPeriod"), fetchBtn: document.getElementById("fetchTeachersData"), sheetDropdown: document.getElementById("worksheetName"), teacherDropdown: document.getElementById("teacherNameDropdown"), classDropdown: document.getElementById("classNameDropdown"), previewTeacherBtn: document.getElementById("showTeacherTimeTable"), previewClassBtn: document.getElementById("classTeacherTimeTable"), customizeBtn: document.getElementById("customizeTable"), cancelBtn: document.getElementById("cancelUpdate"), periodCount: document.getElementById("remainingPeriod"), unreservedContainer: document.querySelector(".table-editor"), table: { el: document.getElementById("TeacherTimeTable"), title: document.getElementById("tableTitle"), subtitle: document.getElementById("tutorName") }
    };

    let school = new School();
    const popup = new Popup();
    const TimeTable = new Table(el.table.el);

    let workbook, isValid = false, state = "idle", className, schoolClone, draggedCell = null;

    const formatPeriods = (data, prefix = "RemainingPeriods:") =>
        `${prefix} ${Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(" ")}`;

    const formatCell = val =>
        typeof val === "object"
            ? Array.isArray(val)
                ? val.join(", ")
                : val ? `<span>${val.subject}</span><span>${val.teacher}</span>` : ""
            : val ?? "";

    const displayTimeTable = table =>
        table.forEach((row, day) =>
            row.forEach((cell, period) =>
                TimeTable.ChangeCellValue(day, period, formatCell(cell))
            )
        );

    const setupDragEvents = cell => {
        cell.addEventListener("dragover", e => e.preventDefault());
        cell.addEventListener("drop", handleDrop);
        cell.addEventListener("dblclick", handleDoubleClick);
    };

    const removeDragEvents = cell => {
        cell.removeEventListener("dragover", e => e.preventDefault());
        cell.removeEventListener("drop", handleDrop);
        cell.removeEventListener("dblclick", handleDoubleClick);
    };

    const handleDrop = async e => {
        e.preventDefault();
        if (!draggedCell) return;

        const _draggedCell = draggedCell;
        const target = e.target;
        const day = target.parentElement.dataset.rowIndex;
        const period = target.dataset.colIndex;
        const spans = _draggedCell.querySelectorAll("span");
        const teacherName = spans[1].textContent;

        if (schoolClone.GetClass(className).IsPeriodReserved(day, period)) {
            await popup.Error("Period is already reserved");
            return;
        }

        if (schoolClone.GetTeacher(teacherName).IsPeriodReserved(day, period)) {
            const confirm = await popup.Warning("This period is already reserved for another class.");
            if (!confirm) return;
        }

        schoolClone.ReservePeriod(className, teacherName, day, period);
        spans.forEach(span => target.appendChild(span));
        _draggedCell.remove();
        el.periodCount.textContent = formatPeriods(schoolClone.GetPeroidCountOfTeachers(className));
    };

    const handleDoubleClick = async e => {
        const target = e.target;
        const spans = target.querySelectorAll("span");
        if (!spans.length) {
            await popup.Error("Already a free period!");
            return;
        }

        const day = target.parentElement.dataset.rowIndex;
        const period = target.dataset.colIndex;
        const elDiv = CreateElement("div", { class: "unreservedPeriod", draggable: "true" },
            `<span>${spans[0].textContent}</span> - <span>${spans[1].textContent}</span>`);
        elDiv.addEventListener("dragstart", e => draggedCell = e.target);
        elDiv.addEventListener("dragend", () => draggedCell = null);
        el.unreservedContainer.appendChild(elDiv);

        schoolClone.UnreservePeriod(className, spans[1].textContent, day, period);
        el.periodCount.textContent = formatPeriods(schoolClone.GetPeroidCountOfTeachers(className));
        target.innerHTML = "";
    };

    const enterEditMode = async () => {
        state = "edit";
        schoolClone = school.Clone();
        displayTimeTable(schoolClone.GetClass(className).GetTimeTable());

        document.getElementById("TeacherTimeTableContainer").classList.add("editing");
        el.customizeBtn.textContent = "Update";
        el.cancelBtn.style.display = "block";
        el.unreservedContainer.innerHTML = "";

        const periodCount = schoolClone.GetPeroidCountOfTeachers(className);
        for (const teacherName in periodCount) {
            const teacher = schoolClone.GetTeacher(teacherName);
            const unassigned = teacher.TotalPeriodPerWeek() - periodCount[teacherName];
            for (let i = 0; i < unassigned; i++) {
                const elDiv = CreateElement("div", { class: "unreservedPeriod", draggable: "true" },
                    `<span>${teacher.Subjects()}</span> - <span>${teacherName}</span>`);
                elDiv.addEventListener("dragstart", e => draggedCell = e.target);
                elDiv.addEventListener("dragend", () => draggedCell = null);
                el.unreservedContainer.appendChild(elDiv);
            }
        }

        TimeTable.GetCells().forEach(setupDragEvents);
        el.customizeBtn.removeEventListener("click", enterEditMode);
        el.customizeBtn.addEventListener("click", applyUpdates);
    };

    const applyUpdates = () => {
        state = "idle";
        school = schoolClone.Clone();
        displayTimeTable(school.GetClass(className).GetTimeTable());

        document.getElementById("TeacherTimeTableContainer").classList.remove("editing");
        el.customizeBtn.textContent = "Edit";
        el.cancelBtn.style.display = "none";

        TimeTable.GetCells().forEach(removeDragEvents);
        el.customizeBtn.removeEventListener("click", applyUpdates);
        el.customizeBtn.addEventListener("click", enterEditMode);
        el.periodCount.textContent = formatPeriods(school.GetPeroidCountOfTeachers(className));
    };

    const cancelUpdates = async () => {
        if (state === "edit") {
            const confirm = await popup.Warning("Discard unsaved edits?");
            if (!confirm) return;
        }

        state = "idle";
        displayTimeTable(school.GetClass(className).GetTimeTable());

        document.getElementById("TeacherTimeTableContainer").classList.remove("editing");
        el.customizeBtn.textContent = "Edit";
        el.cancelBtn.style.display = "none";

        TimeTable.GetCells().forEach(removeDragEvents);
        el.customizeBtn.removeEventListener("click", applyUpdates);
        el.customizeBtn.addEventListener("click", enterEditMode);
        el.periodCount.textContent = formatPeriods(school.GetPeroidCountOfTeachers(className));
    };

    const handleFileChange = e => {
        const file = e.target.files[0];
        if (!file) return;

        el.fileNameLabel.textContent = file.name;
        const reader = new FileReader();
        reader.onload = event => {
            const data = new Uint8Array(event.target.result);
            workbook = XLSX.read(data, { type: "array" });
            populateDropdown(el.sheetDropdown, workbook.SheetNames);
            initializeEventHandlers();
        };
        reader.readAsArrayBuffer(file);
    };

    const validateSheet = () => {
        const sheet = workbook.Sheets[el.sheetDropdown.value];
        const json = XLSX.utils.sheet_to_json(sheet);
        const requiredFields = ["TeacherName", "Subject", "Classes", "PeriodPerDay", "PeriodPerWeek", "TutorTo"];
        isValid = json.length > 0 && requiredFields.every(field => field in json[0]);
    };

    const generateTimetable = () => {
        if (!isValid) return popup.Error("Data format mismatch.");
        const sheet = workbook.Sheets[el.sheetDropdown.value];
        const teacherDetails = XLSX.utils.sheet_to_json(sheet);

        teacherDetails.forEach(({ TeacherName, Subject, Classes, PeriodPerDay, PeriodPerWeek, TutorTo }) => {
            const classList = Classes.replace(/\s/g, "").split(",");
            school.NewTeacher(new Teacher(TeacherName, Subject, classList, PeriodPerDay, PeriodPerWeek, TutorTo));
        });

        populateDropdown(el.teacherDropdown, Object.keys(school.GetTeachers()));
        populateDropdown(el.classDropdown, Object.keys(school.GetClasses()));
        if (el.reserveFP.checked) school.test();
        school.GenerateTimetable();

        document.querySelector(".container").children[1].scrollIntoView({ behavior: "smooth", block: "start" });
        //reset all fields classdropdown, teacherdripdown, timetable, table buttons
    };

    const previewTeacher = async () => {
        if (state === "edit" && !(await popup.Warning("Discard unsaved edits?"))) return;

        document.getElementById("TeacherTimeTableContainer").classList.remove("editing");
        el.customizeBtn.textContent = "Edit";
        el.customizeBtn.style.display = "none";
        el.cancelBtn.style.display = "none";
        state = "idle";

        const teacherName = el.teacherDropdown.value;
        if (!teacherName) return popup.Error("Please select a teacher.");

        const teacher = school.GetTeacher(teacherName);
        el.table.title.textContent = teacherName;
        el.table.subtitle.textContent = `(${teacher.TutorFor()})`;
        TimeTable.Clear();
        displayTimeTable(teacher.GetTimeTable());
    };

    const previewClass = async () => {
        if (state === "edit" && !(await popup.Warning("Discard unsaved edits?"))) return;

        state = "idle";
        className = el.classDropdown.value;
        if (!className) return popup.Error("Please select a class.");

        const classObj = school.GetClass(className);
        el.table.title.textContent = className;
        el.table.subtitle.textContent = `(${classObj.GetTutor().name})`;
        TimeTable.Clear();
        displayTimeTable(classObj.GetTimeTable());
        el.periodCount.textContent = formatPeriods(school.GetPeroidCountOfTeachers(className));

        el.customizeBtn.style.display = "block";
    };

    const populateDropdown = (dropdown, items, clear = false) => {
        if (clear) dropdown.innerHTML = "";
        items.forEach(item => {
            const option = document.createElement("option");
            option.value = option.textContent = item;
            dropdown.appendChild(option);
        });
    };

    const initializeEventHandlers = () => {
        el.sheetDropdown.addEventListener("change", validateSheet);
        el.fetchBtn.addEventListener("click", generateTimetable);
        el.previewTeacherBtn.addEventListener("click", previewTeacher);
        el.previewClassBtn.addEventListener("click", previewClass);
        el.customizeBtn.addEventListener("click", enterEditMode);
        el.cancelBtn.addEventListener("click", cancelUpdates);
    };

    el.fileInput.addEventListener("change", handleFileChange);

});