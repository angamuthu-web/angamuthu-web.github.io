class Popup {
    #container = document.getElementById("popup");
    #title = this.#container.querySelector(".popup-header .title");
    #closeBtn = this.#container.querySelector(".popup-header .close");
    #body = this.#container.querySelector(".popup-content");
    #footer = this.#container.querySelector(".popup-footer");
    #resolveFn = null;

    constructor() {
        this.#closeBtn.addEventListener("click", this.#Close);
    }

    #showPopup(title, content, buttons, callback) {
        this.#resolveFn = callback;
        this.#container.classList.remove("hidden");
        document.body.style.overflow = "hidden";

        this.#title.textContent = title;
        if (typeof content === "string") this.#body.innerHTML = content;
        else this.#body.append(content);
        this.#footer.innerHTML = "";

        buttons?.forEach(({ label, type, value }) => {
            const btn = document.createElement("button");
            btn.textContent = label;
            btn.className = `btn ${type}`;
            btn.setAttribute("aria-label", `${label} warning`);

            const onClick = () => {
                callback(typeof value === "function" ? value() : value);
                this.#Close();
            };

            btn.addEventListener("click", onClick, { once: true });
            this.#footer.appendChild(btn);
        });
    }

    Warning(popupContent) {
        return new Promise((resolve) => {
            this.#showPopup("Warning", popupContent, [
                { label: "Ok", type: "ok", value: true },
                { label: "Cancel", type: "cancel", value: false }
            ], resolve);
        });
    }

    Error(popupContent) {
        return new Promise((resolve) => {
            this.#showPopup("Error", popupContent, [
                { label: "Ok", type: "ok", value: true }
            ], resolve);
        });
    }

    Info(popupContent) {
        return new Promise((resolve) => {
            this.#showPopup("Info", popupContent, [
                { label: "Ok", type: "ok", value: true }
            ], resolve);
        });
    }

    Custom(title, popupContent, buttons) {
        return new Promise((resolve) => {
            this.#showPopup(title, popupContent, buttons, resolve);
        });
    }

    #Close = () => {
        if (this.#resolveFn) {
            this.#resolveFn(false);
            this.#resolveFn = null;
        }
        this.#container.classList.add("hidden");
        document.body.style.overflow = "";

        this.#title.textContent = "";
        this.#body.innerHTML = "";
        this.#footer.innerHTML = "";
    }

    body() {
        return this.#body;
    }

}