if (sessionStorage.getItem("isLoggedIn") !== "true") { window.location.href = "./index.html"; }

document.addEventListener("DOMContentLoaded", () => {
    const el = {
        fileInput: document.getElementById("fileInput"),
        fileNameLabel: document.querySelector(".file-name"),
        reserveFP: document.getElementById("tutorFirstPeriod"),
        fetchBtn: document.getElementById("UploadData"),
        sheetDropdown: document.getElementById("worksheetName"),
        teacherDropdown: document.getElementById("teacherNameDropdown"),
        classDropdown: document.getElementById("classNameDropdown"),
        previewTeacherBtn: document.getElementById("showTeacherTimeTable"),
        previewClassBtn: document.getElementById("PreviewClassTimeTable"),
        generateTimetableBtn: document.getElementById("GenerateclassTimeTable"),
        customizeBtn: document.getElementById("customizeTable"),
        cancelBtn: document.getElementById("cancelUpdate"),
        periodCount: document.getElementById("remainingPeriod"),
        unreservedContainer: document.querySelector(".table-editor"),
        downloadBtn: document.getElementById("saveAs"),
        table: {
            el: document.getElementById("TeacherTimeTable"),
            title: document.getElementById("tableTitle"),
            subtitle: document.getElementById("tutorName")
        }
    };

    let school = new School();
    const popup = new Popup();
    const TimeTable = new Table(el.table.el);

    let workbook = new ExcelJS.Workbook(), isValid = false, state = "idle", className, schoolClone, draggedCell = null, isScheduleCreated = false;
    let tSIndex, cSIndex, projectData;

    const formatPeriods = (data, prefix = "RemainingPeriods:") => {
        let string = `${prefix} `;
        for (const tName in data) {
            for (const subject in data[tName]) {
                string += `${tName}(${subject}): ${data[tName][subject]} `;
            }
        }
        return string;
    }

    const formatCell = val =>
        typeof val === "object"
            ? Array.isArray(val)
                ? val.join(", ")
                : val ? `<span>${val.subject}</span><span>${val.teacher}</span>` : ""
            : val ?? "";

    const displayTimeTable = (table) => {
        TimeTable.Clear();
        table.forEach((row, day) =>
            row.forEach((cell, period) =>
                TimeTable.ChangeCellValue(day, period, formatCell(cell))
            )
        );
    }

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
        const subject = spans[0].textContent;
        const teacherName = spans[1].textContent;

        if (schoolClone.GetClass(className).IsPeriodReserved(day, period)) {
            await popup.Error("Period is already reserved");
            return;
        }

        if (schoolClone.GetTeacher(teacherName).IsPeriodReserved(day, period)) {
            const confirm = await popup.Warning("This period is already reserved for another class.");
            if (!confirm) return;
        }
        if (schoolClone.GetClass(className).IsMaxPeriodPerDayReached(schoolClone.GetTeacher(teacherName), day, subject)
            && !await popup.Warning("Daily limit reached. Would you like to proceed anyway?")) { return; }

        schoolClone.ReservePeriod(className, teacherName, subject, day, period);
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
        const elDiv = CreateElement("div", { class: "unreservedPeriod", draggable: "true" }, `<span>${spans[0].textContent}</span> - <span>${spans[1].textContent}</span>`);
        elDiv.addEventListener("dragstart", e => { draggedCell = e.target; draggedCell.style.opacity = "0.5"; });
        elDiv.addEventListener("dragend", () => { draggedCell.style.opacity = ""; draggedCell = null; });
        el.unreservedContainer.appendChild(elDiv);

        schoolClone.UnreservePeriod(className, spans[1].textContent, spans[0].textContent, day, period);
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
            for (const sub in periodCount[teacherName]) {
                const unassigned = teacher.TotalPeriodPerWeek(sub, className) - periodCount[teacherName][sub];
                for (let i = 0; i < unassigned; i++) {
                    const elDiv = CreateElement("div", { class: "unreservedPeriod", draggable: "true" }, `<span>${sub}</span> - <span>${teacherName}</span>`);
                    elDiv.addEventListener("dragstart", e => { draggedCell = e.target; draggedCell.style.opacity = "0.5"; });
                    elDiv.addEventListener("dragend", () => { draggedCell.style.opacity = ""; draggedCell = null; });
                    el.unreservedContainer.appendChild(elDiv);
                }
            }
        }

        TimeTable.GetCells().forEach(setupDragEvents);
        el.customizeBtn.removeEventListener("click", enterEditMode);
        el.customizeBtn.addEventListener("click", applyUpdates);
    };

    const exitEditMode = async () => {
        state = "idle";

        document.getElementById("TeacherTimeTableContainer").classList.remove("editing");
        el.customizeBtn.textContent = "Edit";
        el.cancelBtn.style.display = "none";

        TimeTable.GetCells().forEach(removeDragEvents);
        el.customizeBtn.removeEventListener("click", applyUpdates);
        el.customizeBtn.addEventListener("click", enterEditMode);
        el.periodCount.textContent = formatPeriods(school.GetPeroidCountOfTeachers(className));
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
            const confirm = await popup.Warning("Are you sure you want to discard your changes?");
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
        const fileArr = file.name.split(".");
        const fileExtension = fileArr[fileArr.length - 1];
        if (fileExtension === "json") {
            reader.onload = async event => {
                const text = event.target.result;
                projectData = JSON.parse(text);
            };
            reader.readAsText(file);
        } else {
            reader.onload = async event => {
                const data = new Uint8Array(event.target.result);
                await workbook.xlsx.load(data);
                projectData = null;
                populateDropdown(el.sheetDropdown, workbook.worksheets.map(sheet => sheet.name), true, `<option value="" hidden>-select-</option>`);
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const validateSheet = (sheetObj) => {
        const requiredFields = ["TeacherName", "Subject", "Classes", "PeriodPerDay", "PeriodPerWeek", "PeriodRange"];
        return sheetObj && sheetObj.length > 0 && requiredFields.every(field => field in sheetObj[0]);
    };

    const geatherData = () => {
        if (state === "edit") return popup.Error("Re-scheduling unavailable while in edit mode. Please exit edit mode to proceed.");
        if (projectData) {
            school = ImportProject(projectData);
            populateDropdown(el.teacherDropdown, Object.keys(school.GetTeachers()), true, `<option value="" hidden>-select-</option>`);
            populateDropdown(el.classDropdown, Object.keys(school.GetClasses()), true, `<option value="" hidden>-select-</option>`);
            document.querySelector(".container").children[1].scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }
        school = new School();
        const sheet = workbook.getWorksheet(el.sheetDropdown.value);
        if (!sheet) return popup.Error("Select a sheet to continue.");

        const dataSheet = sheetToJson(sheet);
        isValid = validateSheet(dataSheet);
        if (!isValid) return popup.Error("Data format mismatch.");

        dataSheet.forEach(({ TeacherName, Subject, Classes, PeriodPerDay, PeriodPerWeek, PeriodRange, TutorTo }) => {
            const classList = Classes.replace(/\s/g, "").split(",");
            const periodRange = PeriodRange.replace(/\s/g, "").split(",").map(Number).map(n => n - 1);
            school.NewTeacher(TeacherName, Subject, classList, PeriodPerDay, PeriodPerWeek, periodRange, TutorTo);
        });

        populateDropdown(el.teacherDropdown, Object.keys(school.GetTeachers()), true, `<option value="" hidden>-select-</option>`);
        populateDropdown(el.classDropdown, Object.keys(school.GetClasses()), true, `<option value="" hidden>-select-</option>`);

        document.querySelector(".container").children[1].scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const generateTimetable = async () => {
        
        className = el.classDropdown.value;
        if (state === "edit") {
            if (await popup.Warning("You have unsaved changes. Do you want to discard them?")) exitEditMode();
            else { el.teacherDropdown.selectedIndex = tSIndex; return; }
        }
        if (!className) return popup.Error("No class selected. Please choose one from the dropdown.");
        tSIndex = null;
        cSIndex = el.classDropdown.selectedIndex;

        const classObj = school.GetClass(className);
        school.ClearClassTimetable(className);
        el.table.title.textContent = className;
        el.table.subtitle.textContent = `(${classObj.GetTutor().name})`;
        TimeTable.Clear();
        school.GenerateTimetable(classObj, el.reserveFP.checked);
        displayTimeTable(classObj.GetTimeTable());
        el.periodCount.textContent = formatPeriods(school.GetPeroidCountOfTeachers(className));

        el.customizeBtn.style.display = "block";
        el.generateTimetableBtn.textContent = "Re-Generate Schedule";
    }

    const previewTeacher = async () => {
        const newSIndex = el.teacherDropdown.selectedIndex;
        if (newSIndex === tSIndex) return;
        if (state === "edit") {
            if (await popup.Warning("You have unsaved changes. Do you want to discard them?")) exitEditMode();
            else { el.teacherDropdown.selectedIndex = tSIndex; return; }
        }

        cSIndex = null;
        el.customizeBtn.style.display = "none";
        tSIndex = el.teacherDropdown.selectedIndex;
        const teacherName = el.teacherDropdown.value;
        if (!teacherName) return popup.Error("No teacher selected. Please choose one from the dropdown.");

        const teacher = school.GetTeacher(teacherName);
        el.table.title.textContent = teacherName;
        el.table.subtitle.textContent = `(${teacher.TutorFor().class})`;
        TimeTable.Clear();
        displayTimeTable(teacher.GetTimeTable());
        el.periodCount.textContent = formatPeriods(school.GetTeacher(teacherName).GetReservedPeriodCountAll());
    };

    const previewClass = async () => {
        const newSIndex = el.classDropdown.selectedIndex;
        if (newSIndex === cSIndex) return;
        if (state === "edit") {
            if (await popup.Warning("You have unsaved changes. Do you want to discard them?")) exitEditMode();
            else { el.classDropdown.selectedIndex = cSIndex; return; }
        }
        el.generateTimetableBtn.textContent = "Generate Schedule";

        tSIndex = null;
        className = el.classDropdown.value;
        cSIndex = el.classDropdown.selectedIndex;
        if (!className) return popup.Error("No class selected. Please choose one from the dropdown.");

        const classObj = school.GetClass(className);
        el.table.title.textContent = className;
        el.table.subtitle.textContent = `(${classObj.GetTutor().name})`;
        TimeTable.Clear();
        displayTimeTable(classObj.GetTimeTable());
        el.periodCount.textContent = formatPeriods(school.GetPeroidCountOfTeachers(className));

        el.customizeBtn.style.display = "block";
        if(classObj.isScheduleCreated()) el.generateTimetableBtn.textContent = "Re-Generate Schedule";
    };

    const download = async (event, clsName, data) => {
        const className = clsName ??  !tSIndex ? el.classDropdown.value : el.teacherDropdown.value;
        if(!className) await popup.Error("No time schedule available for download at this moment.");
        const isScheduleCreated = !tSIndex ? school.GetClass(className).isScheduleCreated() : school.GetTeacher(className).isScheduleCreated();
        if (!isScheduleCreated && !await popup.Warning("No time schedule available for download at this moment. Do you want download Empty Wrokbook?")) return false;
        if (state === "edit") return popup.Error("Download unavailable while in edit mode. Please exit edit mode to proceed.");

        const timetable = data ??  !tSIndex ? school.GetClass(className).GetTimeTable() : school.GetTeacher(className).GetTimeTable();
        const workbook = new ExcelJS.Workbook();
        
        CreateSheet(workbook, className, timetable);

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        TriggerDownload(blob, `Timetable_${className}.xlsx`);
        // SaveProject(school.toJSON());
    }

    const downloadAll = async () => {
        // Create workbook
        if (!isScheduleCreated) return popup.Error("No time schedule available for download at this moment.");
        if (state === "edit") return popup.Error("Download unavailable while in edit mode. Please exit edit mode to proceed.");
        const workbook = new ExcelJS.Workbook();

        const allSheets = {
            ...school.GetTeachers(),
            ...school.GetClasses()
        };

        for (const [sheetName, data] of Object.entries(allSheets)) {
            CreateSheet(workbook, sheetName, data.GetTimeTable())
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        TriggerDownload(blob, "Timetable.xlsx");
    }

    const populateDropdown = (dropdown, items, clear = false, hiddenEl = "") => {
        if (clear) dropdown.innerHTML = hiddenEl;
        items.forEach(item => {
            const option = document.createElement("option");
            option.value = option.textContent = item;
            dropdown.appendChild(option);
        });
    };

    el.fileInput.addEventListener("change", handleFileChange);

    el.fetchBtn.addEventListener("click", geatherData);
    el.previewTeacherBtn.addEventListener("click", previewTeacher);
    el.previewClassBtn.addEventListener("click", previewClass);
    el.generateTimetableBtn.addEventListener("click", generateTimetable);
    el.customizeBtn.addEventListener("click", enterEditMode);
    el.cancelBtn.addEventListener("click", cancelUpdates);
    el.downloadBtn.addEventListener("click", download);

});

function SaveProject(data) {
    const jsonString = JSON.stringify(data, null, 2); 
    const blob = new Blob([jsonString], { type: "application/json" });
    TriggerDownload(blob, `project.json`);
}

function ImportProject(jsonString) {
    let classes = {};
    let teachers = {};

    for (const _class in jsonString["classes"]) {
        const classData = jsonString["classes"][_class];
        classes[_class] = new Class(classData.name, classData.reservedPeriod, classData.teachers, classData.tutor, classData.periodCount, classData.scheduleCreated);
    }

    for (const teacher in jsonString["teachers"]) {
        const teacherData = jsonString["teachers"][teacher];
        teachers[teacher] = new Teacher(teacherData.name, teacherData.tutorTo, teacherData.subjects, teacherData.reservedPeriod, teacherData.reservedPeriodCount, teacherData.scheduleCreated);
    }
    
    return new School(classes, teachers);
}

function sheetToJson(worksheet) {
    const json = []; const header = [];

    worksheet.eachRow((row, rowNumber) => {
        const rowValues = row.values;

        // ExcelJS row.values is 1-based, so index 0 is undefined
        if (rowNumber === 1) {
            // First row is header
            for (let i = 1; i < rowValues.length; i++) {
                header.push(rowValues[i]);
            }
        } else {
            const rowObject = {};
            for (let i = 1; i < rowValues.length; i++) {
                rowObject[header[i - 1]] = rowValues[i];
            }
            json.push(rowObject);
        }
    });

    return json;

}

function CreateSheet(workbook, sheetName, data) {
    const formattedArray = formatWeeklySchedule(data);
    const sheet = workbook.addWorksheet(sheetName);

    formattedArray.forEach(row => sheet.addRow(row));

    ['D1:D6', 'G1:G6', 'J1:J6'].forEach(range => sheet.mergeCells(range));

    sheet.columns = formattedArray[0].map((_, index) => ({
        width: index !== 0 && index % 3 === 0 ? 8 : 18
    }));

    styleCellRange(sheet, 1, 6, 1, 12);
}

function formatWeeklySchedule(array) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]; const headers = [null, "Period 1\n09:30AM 10:10AM", "Period 2\n10:10AM 10:40AM", "Break", "Period 3\n10:50AM 11:30AM", "Period 4\n11:30AM 12:10PM", "Break", "Period 5\n01:10PM 01:50PM", "Period 6\n01:50PM 02:30PM", "Break", "Period 7\n02:40PM 03:20PM", "Period 8\n03:20PM 04:00PM"];

    const schedule = Array.from({ length: 6 }, () => Array(12).fill(null));

    schedule[0] = headers;
    days.forEach((day, index) => {
        schedule[index + 1][0] = day;
    });

    for (let row = 1; row <= 5; row++) {
        let periodIndex = 0;
        for (let col = 1; col < 12; col++) {
            if (col % 3 === 0) continue;
            const cell = array[row - 1][periodIndex++];
            schedule[row][col] = typeof cell === "string" ? cell : Array.isArray(cell) ? cell.toString() : cell?.subject || null;
        }
    }

    return schedule;

}

function styleCellRange(sheet, startRow, endRow, startCol, endCol, styleOptions) {
    for (let row = startRow; row <= endRow; row++) {
        const currentRow = sheet.getRow(row);
        currentRow.height = 33.75;
        for (let col = startCol; col <= endCol; col++) {
            const cell = currentRow.getCell(col);
            cell.alignment = {
                wrapText: true,
                horizontal: 'center',
                vertical: 'middle',
                ...(styleOptions?.alignment || {})
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
                ...(styleOptions?.border || {})
            };
        }
    }
}

function TriggerDownload(blob, fileName) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}