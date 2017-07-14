const { ipcRenderer } = require("electron");

(function() {
    
    var currentItems = null;

    const renderStack = stack => {

        let list = document.getElementById("list");
        list.innerHTML = "";
        stack.forEach((item, index) => {            

            let trimmedText = item.text.replace(/\s{2,}/g, "").trim();
            let value       = trimmedText.substr(0, 100) + (trimmedText.length > 100 ?  " ..." : "");
            let bullet      = createElement(`<span  class="selectedBullet">•</span>`);
            let shortCut    = createElement(`<span  class="shortcut"></span>`);
            let input       = createElement(`<input class="itemValue" type="text" value="${value}" />`);
            let searchIcon  = createElement(`<span  class="searchIcon"><i class='fa fa-search'></i></span>`);
            let clipboardItem = createElement(`<li class="clipboardItem"></li>`);
            clipboardItem.appendChild(bullet);
            clipboardItem.appendChild(shortCut);
            clipboardItem.appendChild(input);
            clipboardItem.appendChild(searchIcon);

            if (index < 9) {
                shortCut.innerText = `Ctrl+${index + 1}`;
            }

            clipboardItem.addEventListener("dblclick", evt => {
                clearSelected();
                let isActive = clipboardItem.classList.contains("active");
                isActive ? clipboardItem.classList.remove("active") : clipboardItem.classList.add("active");
                ipcRenderer.send("set-clipboard", item);
            });

            searchIcon.addEventListener("click", evt => {
                ipcRenderer.send("display-full-text-window", item);
            });

            if (index === 0) {
                clipboardItem.classList.add("active");
            }

            list.appendChild(clipboardItem);            
        });
    };

    const createElement = str => {
        let div = document.createElement("div");
        div.innerHTML = str;
        return div.firstChild;
    };

    const clearSelected = _ => {
        var list = document.getElementsByClassName("clipboardItem");
        for (let i = 0; i < list.length; ++i) {
            var li = list[i];
            li.classList.remove("active");
        }
    };

    const search = text => {

        if (currentItems != null && currentItems.length > 0) {            
            hideAll();
            currentItems.forEach((item, index) => {
                if (item.text.indexOf(text) >= 0) {
                    let element = document.getElementById(`clipboardItem${index}`);
                    element.style.display = "list-item";
                }
            });
        }

    };

    const hideAll = _ => {

        var list = document.getElementsByClassName("clipboardItem");
        for (let i = 0; i < list.length; ++i) {
            var li = list[i];
            li.style.display = "none";
        }
    };

    let timeoutID = 0;
    let input = document.getElementById("searchInput");
    input.addEventListener("keyup", evt => {

        clearTimeout(timeoutID);
        timeoutID = setTimeout(_ => {
            search(input.value.trim());
        }, 300);        
    });

    ipcRenderer.on("clipboard-changed", (evt, stack) => {
        renderStack(stack);
        currentItems = stack;
    });

    ipcRenderer.on("update-bullet", (evt, index) => {
        clearSelected();
        let list = document.getElementsByClassName("clipboardItem");
        let item = list[index];
        item.classList.add("active");
    });

})();


// let title = document.createElement("input");
            // title.type = "text"
            // title.className = "liText";
            // title.value = item.text.replace(/\s{2,}/g, "").trim().substr(0, 100) + " ...";

            // let itemId = document.createElement("span");
            // itemId.className = "clipboardId";
            // itemId.innerText = "•";

            // if (index < 10) {
            //     let shortCut = document.createElement("span");
            //     shortCut.classList.add("shortcut");
            //     shortCut.innerText = `Ctrl+${index}`;
            //     itemId.appendChild(shortCut);
            // }

            // let elipsisSpan = document.createElement("span");
            // elipsisSpan.className = "elipsisSpan";
            // elipsisSpan.innerHTML = "<i class='fa fa-search'></i>";
            
            // let li = document.createElement("li");
            // li.id = `clipboardItem${index}`;
            // li.className = "clipboardItem";
            // li.appendChild(itemId);
            // li.appendChild(title);
            // li.appendChild(elipsisSpan);        
            // li.addEventListener("dblclick", evt => {
            //     clearSelected();
            //     let isActive = li.classList.contains("active");
            //     isActive ? li.classList.remove("active") : li.classList.add("active");
            //     ipcRenderer.send("set-clipboard", item);
            // });

            // if (index === 0) {
            //     li.classList.add("active")
            // }

            // elipsisSpan.addEventListener("click", evt => {
            //     ipcRenderer.send("display-full-text-window", item);
            // });

            // list.appendChild(li);   