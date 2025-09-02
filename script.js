if (sessionStorage.getItem("isLoggedIn") !== "true") { window.location.href = "./index.html"; }

document.addEventListener('DOMContentLoaded', () => {

    const element = {
        dataFile: document.getElementById('fileInput'),
        dataFileName: document.querySelector('.file-name'),
        sheetsNameDropdown: document.querySelector('#worksheetName'),

    }

    /* DOM Elements*/
    const inputFile = document.getElementById('fileInput');
    const fileNameSpan = document.querySelector('.file-name');
    const sheetNameDropdown = document.querySelector('#worksheetName');
    const sheetNameDisplay = document.getElementById("sheetName");
    const teacherTimeTable = new Table(document.getElementById("TeacherTimeTable"));
    const timeTableTitle = document.getElementById("tableTitle");
    const timeTableSubTitle = document.getElementById("tutorName");
    const customizeTableBtn = document.getElementById("customizeTable");
    const cancelUpdateBtn = document.getElementById("cancelUpdate");
    const reserveFirstPeriod = document.getElementById("tutorFirstPeriod");
    const fetchTeachersDataBtn = document.getElementById("fetchTeachersData");
    const teacherNameDropdown = document.getElementById("teacherNameDropdown");
    const classNameDropdown = document.getElementById("classNameDropdown");
    const showTTimeTableBtn = document.getElementById("showTeacherTimeTable");
    const showCTimeTableBtn = document.getElementById("classTeacherTimeTable");
    const remainingPeriodEl = document.getElementById("remainingPeriod");
    const unReservedPeriods = document.querySelector(".table-editor");

    let school = new School();
    let workbook;

    const popup = new Popup();

    const populateDropdown = (dropdown, items, joinDropEl = false) => {
        if (!joinDropEl) dropdown.innerHTML = "";
        items.forEach(item => {
            dropdown.innerHTML += `<option value="${item}">${item}</option>`;
        });
    };

    const showRemainingPeriods = (remainingData, prefix = "RemainingPeriods:") => {
        const periods = Object.entries(remainingData)
            .map(([key, value]) => `${key}: ${value}`)
            .join(" ");
        return `${prefix} ${periods}`;
    };

    const DisplayTimeTable = (timeTable) => {
        for (let day = 0; day < 5; day++) {
            for (let period = 0; period < 8; period++) {
                teacherTimeTable.ChangeCellValue(day, period, (typeof timeTable[day][period] === "object") ? Array.isArray(timeTable[day][period]) ? timeTable[day][period].join(", ") : classFormatter(timeTable[day][period]) : blankFormatter(timeTable[day][period]))
            }
        }
    }

    const blankFormatter = (val) => val ?? "";
    const classFormatter = (val) =>
        val ? `<span>${val.subject}</span><span>${val.teacher}</span>` : "";

    const initializeEventHandlers = () => {
        if (initializeEventHandlers.called) return;
        initializeEventHandlers.called = true;

        sheetNameDropdown.addEventListener('change', () => {
            const worksheet = workbook.Sheets[sheetNameDropdown.value];
            const json = XLSX.utils.sheet_to_json(worksheet);

            const requiredFields = ["TeacherName", "Subject", "Classes", "PeriodPerDay", "PeriodPerWeek", "TutorTo"];
            const isValid = requiredFields.every(field => json[0][field] !== undefined);

            if (!isValid) console.warn("Data format mismatch. Choose a different sheet.");
        });

        fetchTeachersDataBtn.addEventListener("click", () => {
            const selectedSheet = sheetNameDropdown.value;
            if (!selectedSheet) return;

            const worksheet = workbook.Sheets[selectedSheet];
            const teacherDetails = XLSX.utils.sheet_to_json(worksheet);

            teacherDetails.forEach(({ TeacherName, Subject, Classes, PeriodPerDay, PeriodPerWeek, TutorTo }) => {
                const classList = Classes.replace(/\s/g, '').split(",");
                const newTeacher = new Teacher(TeacherName, Subject, classList, PeriodPerDay, PeriodPerWeek, TutorTo);
                school.NewTeacher(newTeacher);
            });

            populateDropdown(teacherNameDropdown, Object.keys(school.GetTeachers()));
            populateDropdown(classNameDropdown, Object.keys(school.GetClasses()));
            if (reserveFirstPeriod.checked) school.test();
            school.GenerateTimetable();
            console.log(school.GetTeachers(), school.GetClasses());
        });

        let state = "idle";

        showTTimeTableBtn.addEventListener("click", async () => {
            if (state == "edit") {
                const response = await popup.Warning("Leaving edit mode will discard any unsaved edits. Continue?");
                if (!response) return;
            }
            state = "idle";
            const selectedTeacherName = teacherNameDropdown.value;
            if (!selectedTeacherName) return;

            const teacher = school.GetTeacher(selectedTeacherName);
            const timeTableData = teacher.GetTimeTable();
            const remainingData = teacher.GetReservedPeriodCountAllClass();

            timeTableTitle.textContent = selectedTeacherName;
            timeTableSubTitle.textContent = `(${school.GetTeacher(selectedTeacherName).TutorFor()})`;
            customizeTableBtn.style.display = "none";
            document.getElementById("TeacherTimeTableContainer").classList.remove("editing");
            document.getElementById("TeacherTimeTable").classList.remove("editing");
            cancelUpdateBtn.style.display = "none";

            DisplayTimeTable(timeTableData);

            remainingPeriodEl.textContent = showRemainingPeriods(remainingData);
        });

        let className;
        let schoolClone;
        let draggedCell = null;

        const OnDragStart = (e) => {
            draggedCell = e.target;
        }

        const OnDragEnd = (e) => {
            draggedCell = null;
        }

        const OnDragOver = (e) => {
            e.preventDefault();
        }

        const OnDrop = async (e) => {
            e.preventDefault();

            if (draggedCell) {

                const _draggedCell = draggedCell;
                const target = e.target;
                const targetChildren = target.children;
                const day = target.parentElement.getAttribute("data-rowIndex");
                const period = target.getAttribute("data-colIndex");

                console.log(_draggedCell.children, e.target);

                const children = _draggedCell.querySelectorAll("span");

                const teacherName = children[1].textContent;

                if (schoolClone.GetClass(className).IsPeriodReserved(day, period)) {
                    await popup.Error("Preiod is already Reserved");
                    return;
                }

                if (schoolClone.GetTeacher(teacherName).IsPeriodReserved(day, period)) {
                    const response = await popup.Warning("This period already reserved to some other class for this teacher!");
                    if (!response) return;
                }

                schoolClone.ReservePeriod(className, teacherName, day, period);
                children.forEach(child => target.appendChild(child));
                _draggedCell.remove();

                remainingPeriodEl.textContent = showRemainingPeriods(schoolClone.GetPeroidCountOfTeachers(className));
            }
        }

        const OnDoubleClick = async (e) => {
            const target = e.target;
            const children = target.querySelectorAll("span");

            if (children.length === 0) {
                await popup.Error("Already it is free period!");
                return;
            }

            const day = target.parentElement.getAttribute("data-rowIndex");
            const period = target.getAttribute("data-colIndex");

            const el = CreateElement("div", { class: "unreservedPeriod", draggable: "true" }, `<span>${children[0].textContent}</span> - <span>${children[1].textContent}</span>`);
            el.addEventListener("dragstart", OnDragStart);
            el.addEventListener("dragend", OnDragEnd);
            unReservedPeriods.appendChild(el);

            schoolClone.UnreservePeriod(className, children[1].textContent, day, period);
            remainingPeriodEl.textContent = showRemainingPeriods(schoolClone.GetPeroidCountOfTeachers(className));
            target.innerHTML = "";
        }

        const OnClickCancleUpdate = async () => {
            if (state == "edit") {
                const response = await popup.Warning("Leaving edit mode will discard any unsaved edits. Continue?");
                if (!response) return;
            }

            state = "idle";
            document.getElementById("TeacherTimeTableContainer").classList.remove("editing");
            document.getElementById("TeacherTimeTable").classList.remove("editing");
            customizeTableBtn.textContent = "Edit";
            cancelUpdateBtn.style.display = "none";


            DisplayTimeTable(school.GetClass(className).GetTimeTable());

            customizeTableBtn.removeEventListener("click", OnClickUpdate);

            teacherTimeTable.GetCells().forEach(cell => {
                cell.removeEventListener("dragover", OnDragOver);
                cell.removeEventListener("drop", OnDrop);
                cell.removeEventListener("dblclick", OnDoubleClick);
            });

            customizeTableBtn.addEventListener("click", OnClickEdit);
            remainingPeriodEl.textContent = showRemainingPeriods(school.GetPeroidCountOfTeachers(className));
            console.log(school.GetClass(className).GetTimeTable(), schoolClone.GetClass(className).GetTimeTable());
        }

        const OnClickUpdate = () => {
            state = "idle";

            customizeTableBtn.removeEventListener("click", OnClickUpdate);
            document.getElementById("TeacherTimeTableContainer").classList.remove("editing");
            document.getElementById("TeacherTimeTable").classList.remove("editing");
            customizeTableBtn.textContent = "Edit";
            cancelUpdateBtn.style.display = "none";

            teacherTimeTable.GetCells().forEach(cell => {
                cell.removeEventListener("dragover", OnDragOver);
                cell.removeEventListener("drop", OnDrop);
                cell.removeEventListener("dblclick", OnDoubleClick);
            });

            school = schoolClone.Clone();
            DisplayTimeTable(school.GetClass(className).GetTimeTable());

            customizeTableBtn.addEventListener("click", OnClickEdit);
            remainingPeriodEl.textContent = showRemainingPeriods(school.GetPeroidCountOfTeachers(className));
            console.log(school.GetClass(className).GetTimeTable());
        }

        const OnClickEdit = async () => {

            state = "edit";
            customizeTableBtn.removeEventListener("click", OnClickEdit);

            schoolClone = school.Clone();
            DisplayTimeTable(schoolClone.GetClass(className).GetTimeTable());

            document.getElementById("TeacherTimeTableContainer").classList.add("editing");
            document.getElementById("TeacherTimeTable").classList.add("editing");
            customizeTableBtn.textContent = "Update";
            cancelUpdateBtn.style.display = "block";

            const periodCount = schoolClone.GetPeroidCountOfTeachers(className)
            unReservedPeriods.innerHTML = "";
            for (const teacherName in periodCount) {
                const teacher = schoolClone.GetTeacher(teacherName);
                const maxPeriod = teacher.TotalPeriodPerWeek();

                const diff = maxPeriod - periodCount[teacherName];
                if (diff > 0) {
                    for (let i = 0; i < diff; i++) {
                        const el = CreateElement("div", { class: "unreservedPeriod", draggable: "true" }, `<span>${teacher.Subjects()}</span> - <span>${teacherName}</span>`);
                        el.addEventListener("dragstart", OnDragStart);
                        el.addEventListener("dragend", OnDragEnd);
                        unReservedPeriods.append(el);
                    }
                }
            }

            teacherTimeTable.GetCells().forEach(cell => {
                cell.addEventListener("dragover", OnDragOver);
                cell.addEventListener("drop", OnDrop);
                cell.addEventListener("dblclick", OnDoubleClick);
            });

            customizeTableBtn.addEventListener("click", OnClickUpdate);
        }

        showCTimeTableBtn.addEventListener("click", async () => {
            const selectedClassName = classNameDropdown.value;
            if (!selectedClassName) return;

            if (state === "edit") {
                const response = await popup.Warning("Leaving edit mode will discard any unsaved edits. Continue?");
                if (!response) return;
            }

            state = "idle";

            teacherTimeTable.GetCells().forEach(cell => {
                cell.removeEventListener("dragover", OnDragOver);

                cell.removeEventListener("drop", OnDrop);
            });
            document.getElementById("TeacherTimeTableContainer").classList.remove("editing");
            document.getElementById("TeacherTimeTable").classList.remove("editing");
            customizeTableBtn.textContent = "Edit";
            cancelUpdateBtn.style.display = "none";
            customizeTableBtn.removeEventListener("click", OnClickUpdate);
            customizeTableBtn.addEventListener("click", OnClickEdit);

            firstTime = false;

            className = selectedClassName;
            const _class = school.GetClass(className);
            timeTableData = _class.GetTimeTable();

            timeTableTitle.textContent = selectedClassName;
            timeTableSubTitle.textContent = `(${_class.GetTutor().name})`;
            customizeTableBtn.style.display = "block";

            for (let day = 0; day < 5; day++) {
                for (let period = 0; period < 8; period++) {
                    teacherTimeTable.ChangeCellValue(day, period, classFormatter(timeTableData[day][period]));
                }
            }

            remainingPeriodEl.textContent = showRemainingPeriods(school.GetPeroidCountOfTeachers(className));
        });

        customizeTableBtn.addEventListener("click", OnClickEdit);
        cancelUpdateBtn.addEventListener("click", OnClickCancleUpdate);

    }

    initializeEventHandlers.called = false;

    inputFile.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        fileNameSpan.textContent = file.name;
        const reader = new FileReader();

        reader.onload = (event) => {
            const data = new Uint8Array(event.target.result);
            workbook = XLSX.read(data, { type: "array" });

            populateDropdown(sheetNameDropdown, workbook.SheetNames);
            sheetNameDropdown.focus();

            initializeEventHandlers();
        };

        reader.readAsArrayBuffer(file);
    });

});

// Known bugs: // sometime it not assing properly, it not assign it period avaliable to assign, need to figure out why