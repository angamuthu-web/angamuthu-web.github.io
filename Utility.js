function ArrayToString(array) {

    let values = "";

    for (let i = 0; i < array.length; i++) { values += (i == 0) ? array[i] : `, ${ array[i] }`; }

    return values;
}

const populateDropdown = (dropdown, items, joinDropEl = false) => { if (!joinDropEl) dropdown.innerHTML = ""; items.forEach(item => { dropdown.innerHTML += <option value="${item}">${item}</option>; }); };

function GetElementCount(array, element) {
    if (array === undefined || array.length === 0) return 0;

    let count = 0; array.forEach(item => { if (!item) return; if (item.subject === element) count++; });

    return count;
}

class UniqueRandom {
    constructor(min, max, canResetOnExhausted = false) { this.min = Math.ceil(min); this.max = Math.floor(max); this.canResetOnExhausted = canResetOnExhausted; this.used = new Set(); }

    next() {
        if (this.used.size >= (this.max - this.min + 1)) { if (this.canResetOnExhausted) this.used = new Set(); else return -1; }

        let value;
        do {
            value = Math.floor(Math.random() * (this.max - this.min + 1)) + this.min;
        } while (this.used.has(value));

        this.used.add(value);
        return value;

    }

    usedSize() { return this.used.size; }
}

function isEqual(arr1, arr2) {
    if (arr1 === arr2) return true;

    if (typeof arr1 !== typeof arr2) return false;

    if (Array.isArray(arr1) && Array.isArray(arr2)) { if (arr1.length !== arr2.length) return false; for (let i = 0; i < arr1.length; i++) { if (!isEqual(arr1[i], arr2[i])) return false; } return true; }

    if (typeof arr1 === "object" && arr1 !== null && arr2 !== null) { const keysA = Object.keys(arr1); const keysB = Object.keys(arr2); if (keysA.length !== keysB.length) return false; for (let key of keysA) { if (!isEqual(arr1[key], arr2[key])) return false; } return true; }

    return false;
}

function CreateElement(tag, attributes, content = "") {
    const el = document.createElement(tag);

    for (const attribute in attributes) { el.setAttribute(attribute, attributes[attribute]); }

    el.innerHTML = content;

    return el;
}