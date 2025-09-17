class Teacher {
    #reservedPeriod; #reservedPeriodCount; #name; #subjects; #maxPeriodPerDay; #totalPeriodPerWeek; #tutorTo;

    constructor(name, maxPeriodPerDay, totalPeriodPerWeek, tutorTo = {}, subjects = {}, reservedPeriod = [new Array(8), new Array(8), new Array(8), new Array(8), new Array(8)], reservedPeriodCount = {}) {
        this.#name = name;
        this.#subjects = subjects;
        this.#maxPeriodPerDay = maxPeriodPerDay;
        this.#totalPeriodPerWeek = totalPeriodPerWeek;
        this.#tutorTo = tutorTo;
        this.#reservedPeriod = reservedPeriod;
        this.#reservedPeriodCount = reservedPeriodCount;
    }

    Name() { return this.#name; }
    Subjects() { return Object.keys(this.#subjects); }
    Classes(subject) { return Object.keys(this.#subjects[subject]); }
    MaxPeriodPerDay(subject, cls) { return this.#subjects[subject][cls].maxPeriodPerDay; }
    TotalPeriodPerWeek(subject, cls) { return this.#subjects[subject][cls].totalPeriodPerWeek; }
    TutorFor() { return this.#tutorTo; }

    AssignTutor(_class, subject) {
        this.#tutorTo = { class: _class, subject: subject };
    }

    ReservePeriod(day, period, subject, className) {
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
        this.#reservedPeriodCount[subject][className]++;
    }

    UneservePeriod(day, period, subject, className) {
        if (typeof this.#reservedPeriod[day][period] === "object") {
            let classIndex = this.#reservedPeriod[day][period].indexOf(className);
            this.#reservedPeriod[day][period].splice(classIndex, 1);

            if (this.#reservedPeriod[day][period].length === 1) this.#reservedPeriod[day][period] = this.#reservedPeriod[day][period][0];
        } else {
            delete this.#reservedPeriod[day][period];
        }
        this.#reservedPeriodCount[subject][className]--;
    }

    IsPeriodReserved(day, period) {
        let isReserved = false;
        if (this.#reservedPeriod[day][period]) isReserved = true;

        return isReserved;
    }

    AddClass(className, subject, maxPeriodPerDay, totalPeriodPerWeek) {
        if (!this.#subjects[subject]) {
            this.#subjects[subject] = {};
        }

        const classes = Array.isArray(className) ? className : [className];
        classes.forEach(cName => {
            if (!this.#subjects[subject][cName]) this.#subjects[subject][cName] = {}
            this.#subjects[subject][cName] = { maxPeriodPerDay: maxPeriodPerDay, totalPeriodPerWeek: totalPeriodPerWeek }
        });
    }

    SetReservedPeriodCount(subject, className, count) {
        if (!this.#reservedPeriodCount[subject]) this.#reservedPeriodCount[subject] = {};
        this.#reservedPeriodCount[subject][className] = count;
    }

    GetReservedPeriodCount(subject, className) {
        return this.#reservedPeriodCount[subject][className];
    }

    GetReservedPeriodCountAll() {
        return this.#reservedPeriodCount;
    }

    GetTimeTable() {
        return this.#reservedPeriod;
    }

    Clone() {
        return new Teacher(this.#name, this.#maxPeriodPerDay, this.#totalPeriodPerWeek, this.#tutorTo, structuredClone(this.#subjects), structuredClone(this.#reservedPeriod), structuredClone(this.#reservedPeriodCount));
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

    AddTeacher(teacher, subject) {
        if (this.#teachers[subject]) return;
        this.#teachers[subject] = { teacher: teacher.Name(), subject: subject };
        teacher.SetReservedPeriodCount(subject, this.#name, 0);
    }

    AssignTutor(name, subject) {
        this.#tutor = { name: name, subject: subject };
    }

    AssignPeriod(teacher, subject) {
        let randomDay = new UniqueRandom(0, 4, true);
        let totalPeriod = teacher.TotalPeriodPerWeek(subject, this.#name);
        let reservedPeriodCount = teacher.GetReservedPeriodCount(subject, this.#name) ?? 0;
        let day, periods;

        let remainingUnResPeriod = totalPeriod - reservedPeriodCount;
        for (let tPeriod = 0; tPeriod < remainingUnResPeriod; tPeriod++) {
            if (!this.IsWeekContainFreePeriodForTeacher(teacher, subject)) break;

            do {
                day = randomDay.next();
            } while (!this.IsDayContainFreePeriod(day) || GetElementCount(this.#reservedPeriod[day], subject) >= teacher.MaxPeriodPerDay(subject, this.#name));

            periods = new UniqueRandom(0, 7);
            let period;

            do {

                period = periods.next();
                if (period === -1) break;

            } while (this.IsPeriodReserved(day, period) || teacher.IsPeriodReserved(day, period) || (periods.usedSize < 8 && period !== -1));

            if (!this.IsPeriodReserved(day, period) && !teacher.IsPeriodReserved(day, period) && period != -1) {
                this.ReservePeriod(day, period, subject);
                teacher.ReservePeriod(day, period, subject, this.#name);
            }
        }
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

    IsWeekContainFreePeriodForTeacher(teacher, subject) {

        for (let day = 0; day < 4; day++) {
            if (!this.IsDayContainFreePeriod(day) || GetElementCount(this.#reservedPeriod[day], subject) >= teacher.MaxPeriodPerDay(subject, this.#name)) continue;

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

    NewTeacher(teacherName, subject, classList, periodPerDay, periodPerWeek, tutorTo) {
        if (!this.#teachers[teacherName]) this.#teachers[teacherName] = new Teacher(teacherName, periodPerDay, periodPerWeek);
        if (tutorTo) this.#teachers[teacherName].AssignTutor(tutorTo, subject);
        this.#teachers[teacherName].AddClass(classList, subject, periodPerDay, periodPerWeek);

        classList.forEach(className => {
            this.NewClass(new Class(className));
            this.#classes[className].AddTeacher(this.#teachers[teacherName], subject);

            if (className === this.#teachers[teacherName].TutorFor().class) {
                this.#classes[className].AssignTutor(teacherName, subject);
            }
        });
    }

    NewClass(newClass) {
        if (this.#classes[newClass.Name()]) return;

        this.#classes[newClass.Name()] = newClass;
    }

    test() {
        Object.values(this.#teachers).forEach(teacher => {
            const tutor = teacher.TutorFor();
            const tClass = this.#classes[tutor.class];
            if (!tClass) return;
            for (let day = 0; day < 5; day++) {
                this.ReservePeriod(tClass.Name(), teacher.Name(), tutor.subject, day, 0)
            }
        });
    }

    GenerateTimetable() {
        Object.values(this.#teachers).forEach(teacher => {

            teacher.Subjects().forEach(subject => {
                teacher.Classes(subject).forEach(className => {
                    this.#classes[className].AssignPeriod(teacher, subject);
                });
            });
        });
    }

    ReservePeriod(className, teacherName, subject, day, period) {

        const _class = this.#classes[className];
        const teacher = this.#teachers[teacherName];

        _class.ReservePeriod(day, period, subject);
        teacher.ReservePeriod(day, period, subject, className);
    }

    UnreservePeriod(className, subject, teacherName, day, period) {

        const _class = this.#classes[className];
        const teacher = this.#teachers[teacherName];

        if (_class.IsPeriodReserved(day, period) && teacher.IsPeriodReserved(day, period)) {
            _class.UneservePeriod(day, period);
            teacher.UneservePeriod(day, period, subject, className);
        }
    }

    GetPeroidCountOfTeachers(className) {
        let periodCount = {};

        const teachersName = this.GetClass(className).GetTeachers();

        teachersName.forEach(teacherName => {
            const teacher = this.GetTeacher(teacherName);
            periodCount[teacherName] = {};
            teacher.Subjects().forEach(sub => {
                if (teacher.Classes(sub).includes(className)) periodCount[teacherName][sub] = teacher.GetReservedPeriodCount(sub, className);
            })
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