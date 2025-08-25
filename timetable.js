class Teacher {
    #reservedPeriod; #reservedPeriodCount; #name; #classes; #subjects; #maxPeriodPerDay; #totalPeriodPerWeek;

    constructor(name, subjects, classes, maxPeriodPerDay, totalPeriodPerWeek, reservedPeriod = [new Array(8), new Array(8), new Array(8), new Array(8), new Array(8)], reservedPeriodCount = {}) {
        this.#name = name;
        this.#subjects = subjects;
        this.#classes = classes;
        this.#maxPeriodPerDay = maxPeriodPerDay;
        this.#totalPeriodPerWeek = totalPeriodPerWeek;
        this.#reservedPeriod = reservedPeriod;
        this.#reservedPeriodCount = reservedPeriodCount;
    }

    Name() { return this.#name; }
    Subjects() { return this.#subjects; }
    Classes() { return this.#classes; }
    MaxPeriodPerDay() { return this.#maxPeriodPerDay; }
    TotalPeriodPerWeek() { return this.#totalPeriodPerWeek; }

    ReservePeriod(day, period, name) {
        this.#reservedPeriod[day][period] = name;
    }

    UneservePeriod(day, period) {
        delete this.#reservedPeriod[day][period];
    }

    IsPeriodReserved(day, period) {
        return this.#reservedPeriod[day][period] !== undefined;
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
        return new Teacher(this.#name, this.#subjects, this.#classes, this.#maxPeriodPerDay, this.#totalPeriodPerWeek, structuredClone(this.#reservedPeriod), structuredClone(this.#reservedPeriodCount));
    }

}

class Class {

    #name;
    #teachers;
    #reservedPeriod;

    constructor(name, reservedPeriod = [new Array(8), new Array(8), new Array(8), new Array(8), new Array(8)], teachers = {}) {
        this.#name = name;
        this.#reservedPeriod = reservedPeriod;
        this.#teachers = teachers;
    }

    AddTeacher(teacherName, subject) {
        this.#teachers[subject] = { teacher: teacherName, subject: subject };
    }

    AssignPeriod(teacher) {
        let randomDay = new UniqueRandom(0, 4, true);
        let totalPeriod = teacher.TotalPeriodPerWeek();
        let reservedPeriodCount = 0;
        let day, periods;

        for (let tPeriod = 0; tPeriod < totalPeriod; tPeriod++) {
            if (!this.IsWeekContainFreePeriodForTeacher(teacher)) break;

            do {
                day = randomDay.next();
            } while (!this.IsDayContainFreePeriod(day) || GetElementCount(this.#reservedPeriod[day], teacher.Subjects()) >= teacher.MaxPeriodPerDay());

            periods = new UniqueRandom(0, 7);
            let period;

            do {

                period = periods.next();
                if (period === -1) break;

            } while (this.IsPeriodReserved(day, period) || teacher.IsPeriodReserved(day, period));

            console.log(day, period, this.#name, teacher.Subjects(), periods.used);

            if (!this.IsPeriodReserved(day, period) && !teacher.IsPeriodReserved(day, period) && period != -1) {
                this.ReservePeriod(day, period, teacher.Subjects());
                teacher.ReservePeriod(day, period, this.#name);
                reservedPeriodCount++;
            }
        }
        if (reservedPeriodCount < totalPeriod) console.log(teacher.Name(), teacher.Subjects(), this.#name, reservedPeriodCount, periods.used);
        teacher.SetReservedPeriodCount(this.#name, reservedPeriodCount);
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
        return this.#reservedPeriod[day][period] !== undefined;
    }

    GetTimeTable() {
        return this.#reservedPeriod;
    }

    Clone() {
        return new Class(this.#name, structuredClone(this.#reservedPeriod), structuredClone(this.#teachers));
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

        newTeacher.Classes().forEach(_class => {
            this.AddTeacherToClass(_class, newTeacher.Name(), newTeacher.Subjects());
        });
    }

    NewClass(newClass) {
        if (this.#classes[newClass.Name()] != undefined) return;

        this.#classes[newClass.Name()] = newClass;
    }

    AddTeacherToClass(className, teacherName, subjects) {
        if (this.#classes[className] === undefined) this.NewClass(new Class(className));

        this.#classes[className].AddTeacher(teacherName, subjects);

        this.#classes[className].AssignPeriod(this.#teachers[teacherName]);
    }

    ReservePeriod(className, teacherName, day, period) {
        if (!day || !period || !className || !teacherName) return;

        const _class = this.#classes[className];
        const teacher = this.#teachers[teacherName];
        let reservedPeriodCount = teacher.GetReservedPeriodCount(className);

        _class.ReservePeriod(day, period, teacher.Subjects());
        teacher.ReservePeriod(day, period, className);
        reservedPeriodCount++;

        teacher.SetReservedPeriodCount(className, reservedPeriodCount);
    }

    UnreservePeriod(className, teacherName, day, period) {
        if (!day || !period || !className || !teacherName) return;

        const _class = this.#classes[className];
        const teacher = this.#teachers[teacherName];
        let reservedPeriodCount = teacher.GetReservedPeriodCount(className);

        if (_class.IsPeriodReserved(day, period) && teacher.IsPeriodReserved(day, period)) {
            _class.UneservePeriod(day, period);
            teacher.UneservePeriod(day, period);
            reservedPeriodCount--;
        }

        teacher.SetReservedPeriodCount(className, reservedPeriodCount);
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