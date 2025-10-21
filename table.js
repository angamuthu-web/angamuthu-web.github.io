class Table {

    #table;
    #tableBody;
    #rows;
    #cells;

    constructor(table) {
        this.#table = table;
        this.#tableBody = this.#table.querySelector("tbody");
        this.#rows = function () { return this.#tableBody.querySelectorAll("tr") };
        this.#cells = function () { return this.#tableBody.querySelectorAll("[data-col-index]") };
    }

    AddRow(rowData) {
        const newRow = CreateElement("tr", { "data-row-index": this.#rows().length });
        for (let i = 0; i < rowData.length; i++) {
            newRow.innerHTML += `<td data-col-index="${i}">${(!rowData[i]) ? "" : rowData[i]}</td>`;
        }
        this.#tableBody.append(newRow);
    }

    DeleteRow(index) {
        this.#tableBody.querySelector(`[data-row-index="${index}"]`).remove();

        const rows = this.#rows();
        for (let i = 0; i < rows.length; i++) {
            rows[i].setAttribute("data-row-index", i);
        }
    }

    ChangeCellValue(rowIndex, columnIndex, value) {
        const row = this.#tableBody.querySelector(`[data-row-index="${rowIndex}"]`);
        row.querySelector(`[data-col-index="${columnIndex}"]`).innerHTML = value;
    }

    SetCellAttr(rowIndex, columnIndex, attrName, value) {
        const row = this.#tableBody.querySelector(`[data-row-index="${rowIndex}"]`);
        row.querySelector(`[data-col-index="${columnIndex}"]`).setAttribute(attrName, value);
    }

    GetCellAttr(rowIndex, columnIndex, attrName) {
        const row = this.#tableBody.querySelector(`[data-row-index="${rowIndex}"]`);
        return row.querySelector(`[data-col-index="${columnIndex}"]`).getAttribute(attrName);
    }

    RemoveCellAttr(rowIndex, columnIndex, attrName) {
        const row = this.#tableBody.querySelector(`[data-row-index="${rowIndex}"]`);
        row.querySelector(`[data-col-index="${columnIndex}"]`).removeAttribute(attrName);
    }

    GetCells() {
        return this.#cells();
    }

    Clear() {
        this.#tableBody.querySelectorAll(`[data-col-index]`).forEach(cell => {
            cell.innerHTML = "";
            cell.removeAttribute("data-subject");
        });
    }

}