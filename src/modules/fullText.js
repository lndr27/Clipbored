const { ipcRenderer } = require("electron");
(function(){

    var displayItem = null;

    ipcRenderer.on("display-full-text", (evt, item) => {

        let text = document.getElementById("text");
        text.innerText = item.text;
        displayItem = item;
    });

    var modes = document.getElementsByClassName("mode");
    for (let i = 0; i < modes.length; ++i) {
        let mode = modes[i];
        if (i == 1) {
            mode.classList.add("active");
        }
        mode.addEventListener("click", evt => {
            clear();
            var chosenMode = evt.target.innerText.trim().toLowerCase();
            let text = document.getElementById("text");

            evt.target.classList.add("active");
            if (chosenMode === "html") {                
                text.innerHTML = displayItem.html;
            }
            else if (chosenMode === "txt") {
                text.innerText = displayItem.text;
            }
        });
    }

    const clear = () => {
        var modes = document.getElementsByClassName("mode");
        for (let i = 0; i < modes.length; ++i) {
            let m = modes[i];
            m.classList.remove("active");
        }
    };

})();