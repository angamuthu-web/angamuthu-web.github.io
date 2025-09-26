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
    GetTimeTable() { return this.#reservedPeriod; }

    AssignTutor(cls, subject) {
        this.#tutorTo = { class: cls, subject: subject };
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
        if (this.#reservedPeriod[day][period] !== undefined) isReserved = true;

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

    GetFreePeriods(day) {
        let freePeriods = [];

        for (let period = 0; period < 8; period++) {
            if (this.#reservedPeriod[day][period] === undefined) {
                freePeriods.push(period);
            }
        }

        return freePeriods;
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
    #periodCount;

    constructor(name, reservedPeriod = [new Array(8), new Array(8), new Array(8), new Array(8), new Array(8)], teachers = {}, tutor = {}, periodCount = {}) {
        this.#name = name;
        this.#reservedPeriod = reservedPeriod;
        this.#teachers = teachers;
        this.#tutor = tutor;
        this.#periodCount = periodCount;
    }

    Name() { return this.#name; }
    GetSubjects() { return Object.keys(this.#teachers); }
    GetTimeTable() { return this.#reservedPeriod; }
    GetTutor() { return this.#tutor; }
    GetTeacher(subject) { return this.#teachers[subject].teacher; }
    GetPeriodCount(day, subject = null) { return !subject ? this.#periodCount[day] ?? {} : this.#periodCount[day]?.subject ?? 0; }

    AddTeacher(teacher, subject) {
        if (this.#teachers[subject]) return;
        this.#teachers[subject] = { teacher: teacher.Name(), subject: subject };
        teacher.SetReservedPeriodCount(subject, this.#name, 0);
    }

    AssignTutor(name, subject) {
        this.#tutor = { name: name, subject: subject };
    }

    IsDayContainFreePeriod(teacher, day) {
        if (day === -1) return false;

        for (let period = 0; period < 8; period++) {
            if (!teacher.IsPeriodReserved(day, period) && !this.IsPeriodReserved(day, period)) {
                return true;
            }
        }

        return false;
    }

    IsWeekContainFreePeriodForTeacher(teacher, subject) {

        for (let day = 0; day < 5; day++) {
            if (this.IsDayContainFreePeriod(teacher, day) && this.GetPeriodCount(day, subject) < teacher.MaxPeriodPerDay(subject, this.#name)) {
                return true;
            }
        }

        return false;
    }

    IsPeriodReserved(day, period) {
        let isReserved = false;
        if (this.#reservedPeriod[day][period] !== undefined) isReserved = true;

        return isReserved;
    }

    ReservePeriod(day, period, subject) {
        this.#reservedPeriod[day][period] = this.#teachers[subject];

        if (!this.#periodCount[day]) this.#periodCount[day] = {};
        if (!this.#periodCount[day][subject]) this.#periodCount[day][subject] = 0;
        if (!this.#periodCount["total"]) this.#periodCount["total"] = {};
        if (!this.#periodCount["total"][subject]) this.#periodCount["total"][subject] = 0;
        this.#periodCount[day][subject]++;
        this.#periodCount["total"][subject]++;
    }

    UneservePeriod(day, period, subject) {
        delete this.#reservedPeriod[day][period];

        this.#periodCount[day][subject]--;
        this.#periodCount["total"][subject]--;
    }

    GetTeachers() {
        let teachers = [];
        for (const teacher in this.#teachers) {
            teachers.push(this.#teachers[teacher].teacher);
        }

        return teachers;
    }

    GetFreePeriods(day) {
        let freePeriods = [];

        for (let period = 0; period < 8; period++) {
            if (this.#reservedPeriod[day][period] === undefined) {
                freePeriods.push(period);
            }
        }

        return freePeriods;
    }

    Clone() {
        return new Class(this.#name, structuredClone(this.#reservedPeriod), structuredClone(this.#teachers), structuredClone(this.#tutor), structuredClone(this.#periodCount));
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

            if (className === tutorTo) {
                this.#classes[className].AssignTutor(teacherName, subject);
            }
        });
    }

    NewClass(newClass) {
        if (this.#classes[newClass.Name()]) return;

        this.#classes[newClass.Name()] = newClass;
    }

    ReserveFirstPeriod(_class) {
        const tObj = _class.GetTutor();
        if(!Object.keys(tObj).length) return;
        const tutor = this.#teachers[tObj.name];
        for (let day = 0; day < 5; day++) {
            this.ReservePeriod(_class.Name(), tutor.Name(), tObj.subject, day, 0)
        }
    }

    GenerateTimetable(shouldAssignFirstPeriodTeacher) {
        Object.values(this.#classes).forEach(_class => {
            if (shouldAssignFirstPeriodTeacher) this.ReserveFirstPeriod(_class);
            _class.GetSubjects().forEach(subject => {
                const teacher = this.#teachers[_class.GetTeacher(subject)];

                const randomDayObj = new UniqueRandomFromArray([0, 1, 2, 3, 4], true);
                const totalPeriod = teacher.TotalPeriodPerWeek(subject, _class.Name());
                const reservedPeriodCount = teacher.GetReservedPeriodCount(subject, _class.Name()) ?? 0;
                let randomDay, periods;

                let remainingUnResPeriod = totalPeriod - reservedPeriodCount;
                for (let tPeriod = 0; tPeriod < remainingUnResPeriod; tPeriod++) {

                    if (!_class.IsWeekContainFreePeriodForTeacher(teacher, subject)) break;

                    do {
                        randomDay = randomDayObj.next();
                    } while (!_class.IsDayContainFreePeriod(teacher, randomDay) || _class.GetPeriodCount(randomDay, subject) >= teacher.MaxPeriodPerDay(subject, _class.Name()));

                    periods = new UniqueRandomFromArray([0, 1, 2, 3, 4, 5, 6, 7]);
                    let period;

                    do {

                        period = periods.next();
                        if (period === -1) break;

                    } while (_class.IsPeriodReserved(randomDay, period) || teacher.IsPeriodReserved(randomDay, period));

                    if (!_class.IsPeriodReserved(randomDay, period) && !teacher.IsPeriodReserved(randomDay, period)) {
                        _class.ReservePeriod(randomDay, period, subject);
                        teacher.ReservePeriod(randomDay, period, subject, _class.Name());
                    }
                }
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
            _class.UneservePeriod(day, period, subject);
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

// Issue: need to assign all subject without free period
// thinking: get free period to teacher on same day and select one from free period check the class for who is reserved to that period and get that teacher and get free period and assign // or check all techer who have free period on unasigned period in class and exchange