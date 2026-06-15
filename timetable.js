class Teacher {
    #reservedPeriod; #reservedPeriodCount; #name; #subjects; #tutorTo; #scheduleCreated; #totalPeriod;

    constructor(name, tutorTo = {}, subjects = {}, reservedPeriod = [new Array(8), new Array(8), new Array(8), new Array(8), new Array(8)], reservedPeriodCount = {}, scheduleCreated = false, totalPeriod = 0) {
        this.#name = name;
        this.#subjects = subjects;
        this.#tutorTo = tutorTo;
        this.#reservedPeriod = reservedPeriod;
        this.#reservedPeriodCount = reservedPeriodCount;
        this.#scheduleCreated = scheduleCreated;
        this.#totalPeriod = totalPeriod;
    }

    Name() { return this.#name; }
    Subjects() { return Object.keys(this.#subjects); }
    Classes(subject) { return Object.keys(this.#subjects[subject]); }
    MaxPeriodPerDay(subject, cls) { return this.#subjects[subject][cls].maxPeriodPerDay; }
    TotalPeriodPerWeek(subject, cls) { return this.#subjects[subject][cls].totalPeriodPerWeek; }
    GetPeriodRange(subject, cls) { return this.#subjects[subject][cls].periodRange; }
    TutorFor() { return this.#tutorTo; }
    GetTimeTable() { return this.#reservedPeriod; }
    GetTotalReservedPeriod() { return this.#totalPeriod; }

    AssignTutor(cls, subject) {
        this.#tutorTo = { class: cls, subject: subject };
    }

    ReservePeriod(day, period, subject, className) {
        const cls = {subject: subject, class: className}
        if (this.#reservedPeriod[day][period]) {
            let combineClass = [];
            if (Array.isArray(this.#reservedPeriod[day][period])) {
                this.#reservedPeriod[day][period].forEach(clss => {
                    combineClass.push(clss);
                });
            } else {
                combineClass.push(this.#reservedPeriod[day][period]);
            }
            combineClass.push(cls);
            this.#reservedPeriod[day][period] = combineClass;
        } else {
            this.#reservedPeriod[day][period] = cls;
        }
        this.#reservedPeriodCount[subject][className]++;
        this.#totalPeriod++;
    }

    UneservePeriod(day, period, subject, className) {
        if (Array.isArray(this.#reservedPeriod[day][period])) {
            let classIndex = this.#reservedPeriod[day][period].findIndex(_subject => _subject.class === className);
            this.#reservedPeriod[day][period].splice(classIndex, 1);

            if (this.#reservedPeriod[day][period].length === 1) this.#reservedPeriod[day][period] = this.#reservedPeriod[day][period][0];
        } else {
            delete this.#reservedPeriod[day][period];
        }
        this.#reservedPeriodCount[subject][className]--;
        this.#totalPeriod--;
    }

    IsPeriodReserved(day, period) {
        let isReserved = false;
        if (this.#reservedPeriod[day][period]) isReserved = true;

        return isReserved;
    }

    AddClass(className, subject, maxPeriodPerDay, totalPeriodPerWeek, periodRange) {
        if (!this.#subjects[subject]) {
            this.#subjects[subject] = {};
        }

        const classes = Array.isArray(className) ? className : [className];
        classes.forEach(cName => {
            if (!this.#subjects[subject][cName]) this.#subjects[subject][cName] = {}
            this.#subjects[subject][cName] = {
                maxPeriodPerDay: maxPeriodPerDay,
                totalPeriodPerWeek: totalPeriodPerWeek,
                periodRange: periodRange
            }
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

    GetFreePeriods(day, periodRange) {
        let freePeriods = [];

        periodRange.forEach(period => {
            if (!this.#reservedPeriod[day][period]) {
                freePeriods.push(period);
            }
        });

        return freePeriods;
    }

    isScheduleCreated() { return this.#scheduleCreated }
    ScheduleCreated(isCreated) { this.#scheduleCreated = isCreated }
    GetPeriod(day, period) { return this.#reservedPeriod[day][period]; }

    Clone() {
        return new Teacher(this.#name, this.#tutorTo, structuredClone(this.#subjects), structuredClone(this.#reservedPeriod), structuredClone(this.#reservedPeriodCount), this.#scheduleCreated, this.#totalPeriod);
    }

    toJSON() {
        return {
            name: this.#name,
            reservedPeriod: this.#reservedPeriod,
            subjects: this.#subjects,
            tutorTo: this.#tutorTo,
            reservedPeriodCount: this.#reservedPeriodCount,
            scheduleCreated: this.#scheduleCreated,
            totalPeriod: this.#totalPeriod
        };
    }

}

class Class {

    #name;
    #teachers;
    #reservedPeriod;
    #tutor;
    #periodCount;
    #scheduleCreated;

    constructor(name, reservedPeriod = [new Array(8), new Array(8), new Array(8), new Array(8), new Array(8)], teachers = {}, tutor = {}, periodCount = {}, scheduleCreated = false) {
        this.#name = name;
        this.#reservedPeriod = reservedPeriod;
        this.#teachers = teachers;
        this.#tutor = tutor;
        this.#periodCount = periodCount;
        this.#scheduleCreated = scheduleCreated;
    }

    Name() { return this.#name; }
    GetSubjects() { return Object.keys(this.#teachers); }
    GetTimeTable() { return this.#reservedPeriod; }
    GetTutor() { return this.#tutor; }
    GetTeacher(subject) { return this.#teachers[subject].teacher; }
    GetPeriodCount(day, subject = null) { return this.#periodCount[day] ? this.#periodCount[day][subject] ?? 0 : 0; }

    AddTeacher(teacher, subject) {
        if (this.#teachers[subject]) return;
        this.#teachers[subject] = { teacher: teacher.Name(), subject: subject };
        teacher.SetReservedPeriodCount(subject, this.#name, 0);
    }

    AssignTutor(name, subject) {
        this.#tutor = { name: name, subject: subject };
    }

    IsMaxPeriodPerDayReached(teacher, day, subject) {
        return this.GetPeriodCount(day, subject) >= teacher.MaxPeriodPerDay(subject, this.#name);
    }

    IsDayContainFreePeriod(teacher, day, subject) {
        if (day === -1) return false;

        const periodRange = teacher.GetPeriodRange(subject, this.#name);

        for (let index = 0; index < periodRange.length; index++) {
            if (!teacher.IsPeriodReserved(day, periodRange[index])
                && !this.IsPeriodReserved(day, periodRange[index])
                && this.GetPeriodCount(day, subject) < teacher.MaxPeriodPerDay(subject, this.#name)) { return true; }
        }

        return false;
    }

    IsWeekContainFreePeriodForTeacher(teacher, subject) {

        for (let day = 0; day < 5; day++) {
            if (this.IsDayContainFreePeriod(teacher, day, subject)) { return true; }
        }

        return false;
    }

    IsPeriodReserved(day, period) {
        let isReserved = false;
        if (this.#reservedPeriod[day][period]) isReserved = true;

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

    GetFreePeriods(day, periodRange) {
        let freePeriods = [];

        periodRange.forEach(period => {
            if (this.#reservedPeriod[day][period] === undefined) {
                freePeriods.push(period);
            }
        });

        return freePeriods;
    }

    isScheduleCreated() { return this.#scheduleCreated }
    ScheduleCreated(isCreated) { this.#scheduleCreated = isCreated }

    GetUnreserveCount(subject, teacher) {
        return teacher.TotalPeriodPerWeek(subject, this.#name) - this.#periodCount['total'][subject];
    }

    GetPeriod(day, period) { return this.#reservedPeriod[day][period]; }

    Clone() {
        return new Class(this.#name, structuredClone(this.#reservedPeriod), structuredClone(this.#teachers), structuredClone(this.#tutor), structuredClone(this.#periodCount), this.#scheduleCreated);
    }

    toJSON() {
        return {
            name: this.#name,
            reservedPeriod: this.#reservedPeriod,
            teachers: this.#teachers,
            tutor: this.#tutor,
            periodCount: this.#periodCount,
            scheduleCreated: this.#scheduleCreated
        };
    }

}

class School {
    #classes; #teachers;

    constructor(classes = {}, teachers = {}) {
        this.#classes = classes;
        this.#teachers = teachers;
    }

    NewTeacher(teacherName, subject, classList, periodPerDay, periodPerWeek, PeroidRange, tutorTo) {
        if (!this.#teachers[teacherName]) this.#teachers[teacherName] = new Teacher(teacherName);
        if (tutorTo) this.#teachers[teacherName].AssignTutor(tutorTo, subject);
        this.#teachers[teacherName].AddClass(classList, subject, periodPerDay, periodPerWeek, PeroidRange);

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
        if (!Object.keys(tObj).length) return;
        const tutor = this.#teachers[tObj.name];
        const totalPeriod = Math.min(tutor.TotalPeriodPerWeek(tObj.subject, _class.Name()), 5);
        for (let day = 0; day < totalPeriod; day++) {
            this.ReservePeriod(_class.Name(), tutor.Name(), tObj.subject, day, 0);
        }
    }

    ClearClassTimetable(className) {
        const cls = this.#classes[className];
        for (let day = 0; day < 5; day++) {
            for (let period = 0; period < 8; period++) {
                const periodData = cls.GetPeriod(day, period);
                if (!periodData) continue;
                this.UnreservePeriod(className, periodData.teacher, periodData.subject, day, period);
            }
        }
    }

    async GenerateTimetable(cls, FirstClassTeacher = false) {
        if (FirstClassTeacher) this.ReserveFirstPeriod(cls);
        cls.GetSubjects().forEach(subject => {
            const teacher = this.#teachers[cls.GetTeacher(subject)];
            const randomDayObj = new UniqueRandomFromArray([0, 1, 2, 3, 4], true);
            const totalPeriod = teacher.TotalPeriodPerWeek(subject, cls.Name());
            const reservedPeriodCount = teacher.GetReservedPeriodCount(subject, cls.Name()) ?? 0;
            let randomDay, periods;

            let remainingUnResPeriod = totalPeriod - reservedPeriodCount;
            for (let tPeriod = 0; tPeriod < remainingUnResPeriod; tPeriod++) {
                if (!cls.IsWeekContainFreePeriodForTeacher(teacher, subject)) break;

                do {
                    randomDay = randomDayObj.next();
                } while (!cls.IsDayContainFreePeriod(teacher, randomDay, subject) || cls.GetPeriodCount(randomDay, subject) >= teacher.MaxPeriodPerDay(subject, cls.Name()));

                periods = new UniqueRandomFromArray(teacher.GetPeriodRange(subject, cls.Name()));
                let period;

                do {

                    period = periods.next();
                    if (period === -1) break;

                } while (cls.IsPeriodReserved(randomDay, period) || teacher.IsPeriodReserved(randomDay, period));

                if (!cls.IsPeriodReserved(randomDay, period) && !teacher.IsPeriodReserved(randomDay, period)) {
                    cls.ReservePeriod(randomDay, period, subject);
                    teacher.ReservePeriod(randomDay, period, subject, cls.Name());
                    teacher.ScheduleCreated(true);
                }
            }
        });
        cls.ScheduleCreated(true);
    }

    ReservePeriod(className, teacherName, subject, day, period) {

        const _class = this.#classes[className];
        const teacher = this.#teachers[teacherName];

        _class.ReservePeriod(day, period, subject);
        teacher.ReservePeriod(day, period, subject, className);
    }

    UnreservePeriod(className, teacherName, subject, day, period) {
        const _class = this.#classes[className];
        const teacher = this.#teachers[teacherName];

        _class.UneservePeriod(day, period, subject);
        teacher.UneservePeriod(day, period, subject, className);
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

    toJSON() {
        let classJson = {};
        let teachersJson = {};
        for (const _class in this.#classes) {
            classJson[_class] = this.#classes[_class].toJSON();
        }

        for (const teacher in this.#teachers) {
            teachersJson[teacher] = this.#teachers[teacher].toJSON();
        }

        return { classes: classJson, teachers: teachersJson }
    }

}

// Issue: need to assign all subject without free period // thinking: get free period to teacher on same day and select one from free period check the class for who is reserved to that period and get that teacher and get free period and assign // or check all techer who have free period on unasigned period in class and exchange
