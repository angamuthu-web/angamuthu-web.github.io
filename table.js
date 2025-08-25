class Table {

    #table;
    #tableBody;
    #rows;
    #cells;

    constructor(table) {
        this.#table = table;
        this.#tableBody = this.#table.querySelector("tbody");
        this.#rows = function () { return this.#tableBody.querySelectorAll("tr") };
        this.#cells = function () { return this.#tableBody.querySelectorAll("[data-colindex]") };
    }

    AddRow(rowData) {
        const newRow = CreateElement("tr", { "data-index": this.#rows().length });
        for (let i = 0; i < rowData.length; i++) {
            newRow.innerHTML += `<td data-colIndex="${i}">${(!rowData[i]) ? "" : rowData[i]}</td>`;
        }
        this.#tableBody.append(newRow);
    }

    DeleteRow(index) {
        this.#tableBody.querySelector(`[data-index="${index}"]`).remove();

        const rows = this.#rows();
        for (let i = 0; i < rows.length; i++) {
            rows[i].setAttribute("data-rowIndex", i);
        }
    }

    ChangeCellValue(rowIndex, columnIndex, value) {
        const row = this.#tableBody.querySelector(`[data-rowIndex="${rowIndex}"]`);
        row.querySelector(`[data-colIndex="${columnIndex}"]`).innerHTML = value;
    }

    GetRow(rowIndex) {

    }

    GetCell(rowIndex, columnIndex) {

    }

    GetCells() {
        return this.#cells();
    }

    ResetTable() {
        this.#tableBody.innerHTML = "";
    }

}