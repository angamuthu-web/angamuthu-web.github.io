class Teacher {
    #reservedPeriod; #reservedPeriodCount; #name; #classes; #subjects; #maxPeriodPerDay; #totalPeriodPerWeek; #tutorTo;

    constructor(name, subjects, classes, maxPeriodPerDay, totalPeriodPerWeek, tutorTo, reservedPeriod = [new Array(8), new Array(8), new Array(8), new Array(8), new Array(8)], reservedPeriodCount = {}) {
        this.#name = name;
        this.#subjects = subjects;
        this.#classes = classes;
        this.#maxPeriodPerDay = maxPeriodPerDay;
        this.#totalPeriodPerWeek = totalPeriodPerWeek;
        this.#tutorTo = tutorTo;
        this.#reservedPeriod = reservedPeriod;
        this.#reservedPeriodCount = reservedPeriodCount;
    }

    Name() { return this.#name; }
    Subjects() { return this.#subjects; }
    Classes() { return this.#classes; }
    MaxPeriodPerDay() { return this.#maxPeriodPerDay; }
    TotalPeriodPerWeek() { return this.#totalPeriodPerWeek; }
    TutorFor() { return this.#tutorTo; }

    ReservePeriod(day, period, className) {
        if (this.#reservedPeriod[day][period]) {
            let combineClass = [];
            if (typeof this.#reservedPeriod[day][period] === "object") {
                this.#reservedPeriod[day][period].forEach(clss => {
                    combineClass.push(clss);
                });
            } else {
                combineClass.push(this.#reservedPeriod[day][period]);
            }
            combineClass.push(className);
            this.#reservedPeriod[day][period] = combineClass;
        } else {
            this.#reservedPeriod[day][period] = className;
        }
        this.#reservedPeriodCount[className]++;
    }

    UneservePeriod(day, period, className) {
        if (typeof this.#reservedPeriod[day][period] === "object") {
            let classIndex = this.#reservedPeriod[day][period].indexOf(className);
            this.#reservedPeriod[day][period].splice(classIndex, 1);

            if (this.#reservedPeriod[day][period].length === 1) this.#reservedPeriod[day][period] = this.#reservedPeriod[day][period][0];
        } else {
            delete this.#reservedPeriod[day][period];
        }
        this.#reservedPeriodCount[className]--;
    }

    IsPeriodReserved(day, period) {
        let isReserved = false;
        if (this.#reservedPeriod[day][period]) isReserved = true;

        return isReserved;
    }

    SetReservedPeriodCount(className, count) {
        this.#reservedPeriodCount[className] = count;
    }

    GetReservedPeriodCount(className) {
        return this.#reservedPeriodCount[className];
    }

    GetReservedPeriodCountAllClass() {
        return this.#reservedPeriodCount;
    }

    GetTimeTable() {
        return this.#reservedPeriod;
    }

    Clone() {
        return new Teacher(this.#name, this.#subjects, this.#classes, this.#maxPeriodPerDay, this.#totalPeriodPerWeek, this.#tutorTo, structuredClone(this.#reservedPeriod), structuredClone(this.#reservedPeriodCount));
    }

}

class Class {

    #name;
    #teachers;
    #reservedPeriod;
    #tutor;

    constructor(name, reservedPeriod = [new Array(8), new Array(8), new Array(8), new Array(8), new Array(8)], teachers = {}, tutor = {}) {
        this.#name = name;
        this.#reservedPeriod = reservedPeriod;
        this.#teachers = teachers;
        this.#tutor = tutor;
    }

    AddTeacher(teacher) {
        if (this.#teachers[teacher.Subjects()]) return;
        this.#teachers[teacher.Subjects()] = { teacher: teacher.Name(), subject: teacher.Subjects() };
        teacher.SetReservedPeriodCount(this.#name, 0);
    }

    AssignTutor(teacher) {
        this.#tutor = { name: teacher.Name(), subject: teacher.Subjects() };
    }

    AssignPeriod(teacher) {
        let randomDay = new UniqueRandom(0, 4, true);
        let totalPeriod = teacher.TotalPeriodPerWeek();
        let reservedPeriodCount = teacher.GetReservedPeriodCount(this.#name) ?? 0;
        let day, periods;

        let remainingUnResPeriod = totalPeriod - reservedPeriodCount;
        for (let tPeriod = 0; tPeriod < remainingUnResPeriod; tPeriod++) {
            if (!this.IsWeekContainFreePeriodForTeacher(teacher)) break;

            do {
                day = randomDay.next();
            } while (!this.IsDayContainFreePeriod(day) || GetElementCount(this.#reservedPeriod[day], teacher.Subjects()) >= teacher.MaxPeriodPerDay());

            periods = new UniqueRandom(0, 7);
            let period;

            do {

                period = periods.next();
                if (period === -1) break;

            } while (this.IsPeriodReserved(day, period) || teacher.IsPeriodReserved(day, period) || (periods.usedSize < 8 && period !== -1));

            console.log(day, period, this.#name, teacher.Subjects(), periods.used);

            if (!this.IsPeriodReserved(day, period) && !teacher.IsPeriodReserved(day, period) && period != -1) {
                this.ReservePeriod(day, period, teacher.Subjects());
                teacher.ReservePeriod(day, period, this.#name);
            }
        }
        if (reservedPeriodCount < totalPeriod) console.log(teacher.Name(), teacher.Subjects(), this.#name, reservedPeriodCount, day, periods.used);
    }

    IsDayContainFreePeriod(day) {
        if (day === -1) return false;

        for (let period = 0; period < 8; period++) {
            if (!this.#reservedPeriod[day][period]) {
                return true;
            }
        }

        return false;
    }

    IsAllDayReserved() {

        for (let day = 0; day < 5; day++) {
            for (let period = 0; period < 8; period++) {
                if (this.#reservedPeriod[day][period] === undefined) {
                    return false;
                }
            }
        }

        return true;
    }

    IsWeekContainFreePeriodForTeacher(teacher) {

        for (let day = 0; day < 4; day++) {
            if (!this.IsDayContainFreePeriod(day) || GetElementCount(this.#reservedPeriod[day], teacher.Subjects()) >= teacher.MaxPeriodPerDay()) continue;

            for (let period = 0; period < 8; period++) {
                if (!this.#reservedPeriod[day][period] && !teacher.IsPeriodReserved(day, period)) {
                    return true;
                }
            }
        }

        return false;
    }

    ReservePeriod(day, period, subject) {
        this.#reservedPeriod[day][period] = this.#teachers[subject];
    }

    UneservePeriod(day, period) {
        delete this.#reservedPeriod[day][period];
    }

    Name() {
        return this.#name;
    }

    GetTeachers() {
        let teachers = [];
        for (const teacher in this.#teachers) {
            teachers.push(this.#teachers[teacher].teacher);
        }

        return teachers;
    }

    GetFreePeriodInDay(day) {
        let freePeriods = [];

        for (let period = 0; period < 8; period++) {
            if (this.#reservedPeriod[day][period] === undefined) {
                freePeriods.push(period);
            }
        }

        return freePeriods;
    }

    GetSubjects() {
        let subjects = [];
        for (const teacher in this.#teachers) {
            subjects.push(this.#teachers[teacher].subject);
        }

        return subjects;
    }

    IsPeriodReserved(day, period) {
        let isReserved = false;
        if (this.#reservedPeriod[day][period]) isReserved = true;

        return isReserved;
    }

    GetTimeTable() {
        return this.#reservedPeriod;
    }

    GetTutor() {
        return this.#tutor;
    }

    Clone() {
        return new Class(this.#name, structuredClone(this.#reservedPeriod), structuredClone(this.#teachers), structuredClone(this.#tutor));
    }

}

class School {
    #classes; #teachers;

    constructor(classes = {}, teachers = {}) {
        this.#classes = classes;
        this.#teachers = teachers;
    }

    NewTeacher(newTeacher) {
        if (this.#teachers[newTeacher.Name()] != undefined) return;

        this.#teachers[newTeacher.Name()] = newTeacher;

        newTeacher.Classes().forEach(className => {
            this.NewClass(new Class(className));
            // this.AddTeacherToClass(_class, newTeacher.Name(), newTeacher.Subjects());
            if (className === newTeacher.TutorFor()) {
                this.#classes[className].AddTeacher(newTeacher);
                this.#classes[className].AssignTutor(newTeacher);
            }
        });
    }

    NewClass(newClass) {
        if (this.#classes[newClass.Name()]) return;

        this.#classes[newClass.Name()] = newClass;
    }

    test() {
        Object.values(this.#teachers).forEach(teacher => {
            const tClass = this.#classes[teacher.TutorFor()];
            if (!tClass) return;
            for (let day = 0; day < 5; day++) {
                this.ReservePeriod(tClass.Name(), teacher.Name(), day, 0)
            }
        });
    }

    GenerateTimetable() {
        Object.values(this.#teachers).forEach(teacher => {

            teacher.Classes().forEach(className => {
                this.#classes[className].AddTeacher(teacher);
                this.#classes[className].AssignPeriod(teacher);
            });
        });
    }

    ReservePeriod(className, teacherName, day, period) {
        // if (!day || !period || !className || !teacherName) return;

        const _class = this.#classes[className];
        const teacher = this.#teachers[teacherName];

        _class.ReservePeriod(day, period, teacher.Subjects());
        teacher.ReservePeriod(day, period, className);
    }

    UnreservePeriod(className, teacherName, day, period) {
        // if (!day || !period || !className || !teacherName) return;

        const _class = this.#classes[className];
        const teacher = this.#teachers[teacherName];

        if (_class.IsPeriodReserved(day, period) && teacher.IsPeriodReserved(day, period)) {
            _class.UneservePeriod(day, period);
            teacher.UneservePeriod(day, period, className);
        }
    }

    GetPeroidCountOfTeachers(className) {
        let periodCount = {};

        const teachersName = this.GetClass(className).GetTeachers();

        teachersName.forEach(teacherName => {
            const teacher = this.GetTeacher(teacherName);
            periodCount[teacherName] = teacher.GetReservedPeriodCount(className);
        });

        return periodCount;
    }

    GetTeacher(teacherName) {
        return this.#teachers[teacherName];
    }

    GetClass(className) {
        return this.#classes[className];
    }

    GetClasses() {
        return this.#classes;
    }

    GetTeachers() {
        return this.#teachers;
    }

    Clone() {
        let cloneClasses = {};
        let cloneTeachers = {};
        for (const _class in this.#classes) {
            cloneClasses[_class] = this.#classes[_class].Clone();
        }

        for (const teacher in this.#teachers) {
            cloneTeachers[teacher] = this.#teachers[teacher].Clone();
        }

        return new School(cloneClasses, cloneTeachers);
    }

}