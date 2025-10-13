if (sessionStorage.getItem("isLoggedIn") !== "true") { window.location.href = "./index.html"; }

document.addEventListener("DOMContentLoaded", async () => {
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
        downloadBtn: document.getElementById("export"),
        saveBtn: document.getElementById("save"),
        moreBtn: document.getElementById("more"),
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

    const ClearTable = () => {
        el.table.title.textContent = "";
        el.table.subtitle.textContent = ``;
        el.customizeBtn.style.display = "none";
        el.generateTimetableBtn.textContent = "Generate Schedule";
        el.generateTimetableBtn.disabled = true;
        tSIndex = null;
        cSIndex = null;
        TimeTable.Clear();
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
            const confirm = await popup.Warning(`This period is already assigned to this teacher for class ${schoolClone.GetTeacher(teacherName).GetPeriod(day, period)}. Would you like to combine the classes?`);
            if (!confirm) return;
        }
        if (schoolClone.GetClass(className).IsMaxPeriodPerDayReached(schoolClone.GetTeacher(teacherName), day, subject)
            && !await popup.Warning("Daily limit reached. Would you like to proceed anyway?")) { return; }

        schoolClone.ReservePeriod(className, teacherName, subject, day, period);
        spans.forEach(span => target.appendChild(span));
        _draggedCell.remove();
        el.periodCount.textContent = formatPeriods(schoolClone.GetPeroidCountOfTeachers(className), "");
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
        el.periodCount.textContent = formatPeriods(schoolClone.GetPeroidCountOfTeachers(className), "");
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
        el.periodCount.textContent = formatPeriods(school.GetPeroidCountOfTeachers(className), "");
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
        el.periodCount.textContent = formatPeriods(school.GetPeroidCountOfTeachers(className), "");
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
        el.periodCount.textContent = formatPeriods(school.GetPeroidCountOfTeachers(className), "");
    };

    const handleFileChange = e => {
        const file = e.target.files[0];
        if (!file) return;

        el.fileNameLabel.textContent = file.name;
        const reader = new FileReader();
        const fileArr = file.name.split(".");
        const fileExtension = fileArr[fileArr.length - 1];
        showLoadingOverlay();
        if (fileExtension === "json") {
            reader.onload = async event => {
                const text = event.target.result;
                projectData = JSON.parse(text);
                hideLoadingOverlay();
                el.sheetDropdown.disabled = true;
                el.sheetDropdown.selectedIndex = 0;
            };
            reader.readAsText(file);
        } else {
            reader.onload = async event => {
                const data = new Uint8Array(event.target.result);
                await workbook.xlsx.load(data);
                projectData = null;
                populateDropdown(el.sheetDropdown, workbook.worksheets.map(sheet => sheet.name), true, `<option value="" hidden>-select-</option>`);
                hideLoadingOverlay();
                el.sheetDropdown.disabled = false;
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
        if (projectData) { school = ImportProject(projectData); }
        else {
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
        }

        populateDropdown(el.teacherDropdown, Object.keys(school.GetTeachers()), true, `<option value="" hidden>-select-</option>`);
        populateDropdown(el.classDropdown, Object.keys(school.GetClasses()), true, `<option value="" hidden>-select-</option>`);

        document.querySelector(".container").children[1].scrollIntoView({ behavior: "smooth", block: "start" });
        ClearTable();
    };

    const onClassDropdownChange = () => {
        if(cSIndex !== el.classDropdown.selectedIndex) el.generateTimetableBtn.disabled = true;
        else el.generateTimetableBtn.disabled = false;
    }

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
        el.periodCount.textContent = formatPeriods(school.GetPeroidCountOfTeachers(className), "");

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

        el.generateTimetableBtn.disabled = true;
        el.moreBtn.style.display = "";
        const teacher = school.GetTeacher(teacherName);
        el.table.title.textContent = teacherName;
        el.table.subtitle.textContent = `(${teacher.TutorFor().class})`;
        TimeTable.Clear();
        displayTimeTable(teacher.GetTimeTable());
        el.periodCount.textContent = formatPeriods(school.GetTeacher(teacherName).GetReservedPeriodCountAll(), "");
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

        el.generateTimetableBtn.disabled = false;
        el.moreBtn.style.display = "none";
        const classObj = school.GetClass(className);
        el.table.title.textContent = className;
        el.table.subtitle.textContent = `(${classObj.GetTutor().name})`;
        TimeTable.Clear();
        displayTimeTable(classObj.GetTimeTable());
        el.periodCount.textContent = formatPeriods(school.GetPeroidCountOfTeachers(className), "");

        el.customizeBtn.style.display = "block";
        if (classObj.isScheduleCreated()) el.generateTimetableBtn.textContent = "Re-Generate Schedule";
    };

    const save = async () => {
        if (state === "edit") return popup.Error("Saving unavailable while in edit mode. Please exit edit mode to proceed.");
        SaveProject(school.toJSON());
    }

    const download = async () => {
        // Create workbook
        if (state === "edit") return popup.Error("Download unavailable while in edit mode. Please exit edit mode to proceed.");
        const selectedNames = await popup.Custom("Downlods", downloadPopupContent(), [{ label: "Download", type: "ok", value: DownloadOption }, { label: "Cancle", type: "ok", value: false }]);
        if (!selectedNames) return;
        if (!selectedNames.classes.length && !selectedNames.teachers.length && !selectedNames.other.length) return popup.Error("No time schedule available for download at this moment.");
        showLoadingOverlay();
        const workbook = new ExcelJS.Workbook();

        selectedNames["teachers"].forEach(name => {
            CreateTimetableSheet(workbook, name, school.GetTeacher(name).GetTimeTable(), formatPeriods(school.GetTeacher(name).GetReservedPeriodCountAll(), ""));
        });
        selectedNames["classes"].forEach(name => {
            CreateTimetableSheet(workbook, name, school.GetClass(name).GetTimeTable(), formatPeriods(school.GetPeroidCountOfTeachers(name), ""));
        });
        selectedNames["other"].forEach(name => {
            switch(name) {
                case "moreDetails":
                    CreateFreePeriodSheet(workbook, "Free Period Details", Object.values(school.GetTeachers()));
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        TriggerDownload(blob, "Timetables.xlsx");
        hideLoadingOverlay();
    }

    const populateDropdown = (dropdown, items, clear = false, hiddenEl = "") => {
        if (clear) dropdown.innerHTML = hiddenEl;
        items.forEach(item => {
            const option = document.createElement("option");
            option.value = option.textContent = item;
            dropdown.appendChild(option);
        });
    };

    const onClickAll = function() {
        const parent = this.parentElement.parentElement;
        const allCheckbox = parent.querySelectorAll(`input[name="options"]`);
        if(this.checked) {
            allCheckbox.forEach(checkbox => {
                checkbox.checked = true;
            });
        } else {
            allCheckbox.forEach(checkbox => {
                checkbox.checked = false;
            });
        }
    }

    const onClickCheckBox = function() {
        const grandParent = this.parentElement.parentElement.parentElement
        const parent = this.parentElement.parentElement;
        const allCheckbox = grandParent.querySelector(`[data-all-checkbox]`);
        const allOption = parent.querySelectorAll(`input[name="options"]`)
        if(!this.checked) {
           allCheckbox.checked = false;
        } else {
            for (let index = 0; index < allOption.length; index++) {
                if(!allOption[index].checked) {
                    allCheckbox.checked = false;
                    return;
                }
            }
            allCheckbox.checked = true;
        }
        
    }
    
    const downloadPopupContent = () => {
        let teacherList = CreateElement("div", { "data-category": "teacher", "class": "checkbox-group scroll-area" }, "");
        let classList = CreateElement("div", { "data-category": "class", "class": "checkbox-group scroll-area" }, "");
        let otherList = CreateElement("div", { "data-category": "other", "class": "checkbox-group scroll-area" }, "");

        const teachers = school.GetTeachers();
        const classes = school.GetClasses();
        teacherList.innerHTML = ``;
        for (const teacher in teachers) {
            teacherList.innerHTML += `<label><input type="checkbox" name="options" value="${teacher}"> ${teacher}</label>`;
        }
        classList.innerHTML = ``;
        for (const cls in classes) {
            classList.innerHTML += `<label><input type="checkbox" name="options" value="${cls}"> ${cls}</label>`;
        }
        otherList.innerHTML = ``;
        otherList.innerHTML += `<label><input type="checkbox" name="options" value="moreDetails"> Free Period details</label>`;

        const content = `<span class="listContainer">
                            <h3>Teachers</h3>
                            <label><input type="checkbox" data-all-checkbox="teacher"> All</label>
                            ${teacherList.outerHTML}
                        </span>
                        <span class="listContainer">
                            <h3>Classes</h3>
                            <label><input type="checkbox" data-all-checkbox="class"> All</label>
                            ${classList.outerHTML}
                        </span>
                        <span class="listContainer">
                            <h3>Other</h3>
                            <label><input type="checkbox" data-all-checkbox="other"> All</label>
                            ${otherList.outerHTML}
                        </span>`;
        
        const containersWrapperEl = CreateElement("div", { "class": "grid-container" }, content);

        const teacherAllCheckBox = containersWrapperEl.querySelector('[data-all-checkbox="teacher"');
        const classAllCheckBox = containersWrapperEl.querySelector('[data-all-checkbox="class"');
        const otherAllCheckBox = containersWrapperEl.querySelector('[data-all-checkbox="other"');
        
        const cAllCheckBox = containersWrapperEl.querySelector('[data-category="class"]').querySelectorAll('input[name="options"]');
        const tAllCheckBox = containersWrapperEl.querySelector('[data-category="teacher"]').querySelectorAll('input[name="options"]');
        const oAllCheckBox = containersWrapperEl.querySelector('[data-category="other"]').querySelectorAll('input[name="options"]');
        
        teacherAllCheckBox.addEventListener("change", onClickAll);
        classAllCheckBox.addEventListener("change", onClickAll);
        otherAllCheckBox.addEventListener("change", onClickAll);

        cAllCheckBox.forEach(checkbox => {
            checkbox.addEventListener("change", onClickCheckBox);
        });
        tAllCheckBox.forEach(checkbox => {
            checkbox.addEventListener("change", onClickCheckBox);
        });
        oAllCheckBox.forEach(checkbox => {
            checkbox.addEventListener("change", onClickCheckBox);
        });

        return containersWrapperEl;
    }

    const DownloadOption = () => {
        const clsChecked = document.querySelector('[data-category="class"]').querySelectorAll('input[name="options"]:checked');
        const teachersChecked = document.querySelector('[data-category="teacher"]').querySelectorAll('input[name="options"]:checked');
        const otherChecked = document.querySelector('[data-category="other"]').querySelectorAll('input[name="options"]:checked');
        const classNames = Array.from(clsChecked).map(cb => cb.value);
        const teacherNames = Array.from(teachersChecked).map(cb => cb.value);
        const otherNames = Array.from(otherChecked).map(cb => cb.value);
        return { classes: classNames, teachers: teacherNames, other: otherNames }
    }

    const freePeriodStruct = (name, totalPeriod, freePeriods) => {
        return `<div data-teacher="${name}" style="margin: 5px;padding: 10px 10px 20px 10px;border-radius: 10px;">
                    <div style="font-weight: 700;">${name}</div>
                    <div style="padding-left: 15px;">
                        <div>Total Periods: <span style="padding-left: 5px;">${totalPeriod}</span></div>
                        <div>
                            <span>Free Periods:</span>
                            <table class="freePeriodTable">
                                <tbody>
                                    <tr><td>Monday</td><td>Tuesday</td><td>Wednesday</td><td>Thursday</td><td>Friday</td></tr>
                                    <tr>
                                        <td>${freePeriods[0] ? freePeriods[0].join(", ") : "-"}</td>
                                        <td>${freePeriods[1] ? freePeriods[1].join(", ") : "-"}</td>
                                        <td>${freePeriods[2] ? freePeriods[2].join(", ") : "-"}</td>
                                        <td>${freePeriods[3] ? freePeriods[3].join(", ") : "-"}</td>
                                        <td>${freePeriods[4] ? freePeriods[4].join(", ") : "-"}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>`;
    }

    const onClickMore = async () => {
        let content = ``;
        const teacherName = el.teacherDropdown.options[tSIndex].value;
        const teacher = school.GetTeacher(teacherName);

        const freePeriodsArr = [];
        for (let day = 0; day < 5; day++) {
            const todayFreePeriods = teacher.GetFreePeriods(day, [0, 1, 2, 3, 4, 5, 6, 7]);
            const FormatPeriod = [];
            for (let index = 0; index < todayFreePeriods.length; index++) {
                FormatPeriod.push(++todayFreePeriods[index]);
            }
            freePeriodsArr.push(FormatPeriod);
        }
        content += freePeriodStruct(teacher.Name(), teacher.GetTotalReservedPeriod(), freePeriodsArr);

        const selectedTeacher = el.teacherDropdown.options[tSIndex].value;

        popup.Custom("More Details", content, [{ label: "Close", type: "", value: false }]);
    }

    el.fileInput.addEventListener("change", handleFileChange);

    el.fetchBtn.addEventListener("click", geatherData);
    el.previewTeacherBtn.addEventListener("click", previewTeacher);
    el.previewClassBtn.addEventListener("click", previewClass);
    el.classDropdown.addEventListener("change", onClassDropdownChange)
    el.generateTimetableBtn.addEventListener("click", generateTimetable);
    el.customizeBtn.addEventListener("click", enterEditMode);
    el.cancelBtn.addEventListener("click", cancelUpdates);
    el.downloadBtn.addEventListener("click", download);
    el.saveBtn.addEventListener("click", save);
    el.moreBtn.addEventListener("click", onClickMore);

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
        teachers[teacher] = new Teacher(teacherData.name, teacherData.tutorTo, teacherData.subjects, teacherData.reservedPeriod, teacherData.reservedPeriodCount, teacherData.scheduleCreated, teacherData.totalPeriod);
    }

    return new School(classes, teachers);
}

function sheetToJson(worksheet) {
    const json = []; const header = [];

    worksheet.eachRow((row, rowNumber) => {
        const rowValues = row.values;

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

function formatMoreDetails(teacher) {

    const freePeriodsArr = [];
    for (let day = 0; day < 5; day++) {
        const todayFreePeriods = teacher.GetFreePeriods(day, [0, 1, 2, 3, 4, 5, 6, 7]);
        const FormatPeriod = [];
        for (let index = 0; index < todayFreePeriods.length; index++) {
            FormatPeriod.push(++todayFreePeriods[index]);
        }
        freePeriodsArr.push(FormatPeriod.join(", "));
    }

    return {name: teacher.Name(), totalPeriod: teacher.GetTotalReservedPeriod(), freePeriods: freePeriodsArr};
}

function CreateTimetableSheet(workbook, sheetName, data, reservedPeriodCount) {
    const formattedArray = formatWeeklySchedule(data);
    const sheet = workbook.addWorksheet(sheetName);

    formattedArray.forEach(row => sheet.addRow(row));
    sheet.getCell("A7").value = reservedPeriodCount;

    ['D1:D6', 'G1:G6', 'J1:J6', 'A7:L7'].forEach(range => sheet.mergeCells(range));

    sheet.columns = formattedArray[0].map((_, index) => ({
        width: index !== 0 && index % 3 === 0 ? 8 : 18
    }));

    styleCellRange(sheet, 1, 7, 1, 12);
}

function CreateFreePeriodSheet(workbook, sheetName, data) {
    const sheet = workbook.addWorksheet(sheetName);

    const startRow = 1;
    let endRow = 2;
    const startCol = 1;
    const endCol = 7;

    sheet.addRow(["Name", "Total Allocated Period", "Free Periods"]);
    sheet.addRow(["", "", "Monday", "Tuesday", "Wenseday", "Thusrday", "Friday"]);
    sheet.columns = [0,1,2,3,4,5,6].map((_, index) => ({ width: 22 }));
    ['A1:A2', 'B1:B2', 'C1:G1'].forEach(range => sheet.mergeCells(range));
    data.forEach(teacher => {
        const moreDetails = formatMoreDetails(teacher);
        sheet.addRow([moreDetails.name, moreDetails.totalPeriod, ...moreDetails.freePeriods]);
        endRow += 1;
    });
    styleCellRange(sheet, startRow, endRow, startCol, endCol);
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

function showLoadingOverlay() {
    document.body.style.overflow = "hidden";
    const overlay = document.createElement("div");
    overlay.className = "loading-overlay";
    document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
    const overlay = document.querySelector(".loading-overlay");
    if (overlay) overlay.remove();
    document.body.style.overflow = "";
}
