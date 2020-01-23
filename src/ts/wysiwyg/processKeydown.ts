import {getSelectPosition} from "../editor/getSelectPosition";
import {setSelectionFocus} from "../editor/setSelection";
import {scrollCenter} from "../util/editorCommenEvent";
import {
    hasClosestByAttribute,
    hasClosestByClassName,
    hasClosestByMatchTag, hasClosestByTag,
    hasTopClosestByTag,
} from "../util/hasClosest";
import {processKeymap} from "../util/processKeymap";
import {afterRenderEvent} from "./afterRenderEvent";
import {processCodeRender} from "./processCodeRender";
import {setHeading} from "./setHeading";
import {setRangeByWbr} from "./setRangeByWbr";
import {Constants} from "../constants";

export const processKeydown = (vditor: IVditor, event: KeyboardEvent) => {
    // 添加第一次记录 undo 的光标
    vditor.wysiwygUndo.recordFirstWbr(vditor);
    // 仅处理以下快捷键操作
    if (event.key !== "Enter" && event.key !== "Tab" && event.key !== "Backspace"
        && !event.metaKey && !event.ctrlKey && event.key !== "Escape") {
        return false;
    }
    if (event.isComposing) {
        return false;
    }
    // TODO 上下左右遇到块预览的处理重构
    const range = getSelection().getRangeAt(0);
    const startContainer = range.startContainer;

    // 表格自动完成
    const pElement = hasClosestByMatchTag(range.startContainer, "P");
    if (pElement && ((!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.key === "Enter") ||
        (!event.metaKey && !event.ctrlKey && event.shiftKey && !event.altKey && event.key === "Enter"))) {
        const pText = String.raw`${pElement.textContent}`.replace(/\\\|/g, "").trim();
        const pTextList = pText.split("|");
        if (pText.startsWith("|") && pText.endsWith("|") && pTextList.length > 3) {
            let tableHeaderMD = pTextList.map(() => "---").join("|");
            tableHeaderMD = pElement.textContent + tableHeaderMD.substring(3, tableHeaderMD.length - 3) + "\n|<wbr>";
            pElement.outerHTML = vditor.lute.SpinVditorDOM(tableHeaderMD);
            setRangeByWbr(vditor.wysiwyg.element, range);
            afterRenderEvent(vditor);
            scrollCenter(vditor.wysiwyg.element);
            event.preventDefault();
            return true;
        }
    }

    // inline code: 光标位于 inline code 前的零宽字符之前或之后进行删除
    if (event.key === "Backspace" && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey &&
        range.toString() === "" && range.startContainer.textContent === Constants.ZWSP && range.startOffset === 1
        && !range.startContainer.previousSibling) {
        vditor.wysiwyg.preventInput = true
        range.startContainer.textContent = ""
        return true;
    }

    // table
    const cellElement = hasClosestByMatchTag(startContainer, "TD") ||
        hasClosestByMatchTag(startContainer, "TH");
    if (cellElement) {
        // 换行或软换行：在 cell 中添加 br
        if ((!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.key === "Enter") ||
            (!event.metaKey && !event.ctrlKey && event.shiftKey && !event.altKey && event.key === "Enter")) {
            if (!cellElement.lastElementChild ||
                (cellElement.lastElementChild && (!cellElement.lastElementChild.isEqualNode(cellElement.lastChild) ||
                    cellElement.lastElementChild.tagName !== "BR"))) {
                cellElement.insertAdjacentHTML("beforeend", "<br>");
            }
            const brElement = document.createElement('br')
            range.insertNode(brElement)
            range.setStartAfter(brElement)
            afterRenderEvent(vditor);
            event.preventDefault();
            return true;
        }

        // Backspace：光标移动到前一个 cell
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.key === "Backspace"
            && range.startOffset === 0 && range.collapsed) {
            let previousElement = cellElement.previousElementSibling;
            if (!previousElement) {
                if (cellElement.parentElement.previousElementSibling) {
                    previousElement = cellElement.parentElement.previousElementSibling.lastElementChild;
                } else if (cellElement.parentElement.parentElement.tagName === "TBODY" &&
                    cellElement.parentElement.parentElement.previousElementSibling) {
                    previousElement = cellElement.parentElement
                        .parentElement.previousElementSibling.lastElementChild.lastElementChild;
                } else {
                    previousElement = null;
                }
            }
            if (previousElement) {
                range.selectNodeContents(previousElement);
                range.collapse(false);
            }
            event.preventDefault();
            return true;
        }

        // tab：光标移向下一个 cell
        if (event.key === "Tab") {
            let nextElement = cellElement.nextElementSibling;
            if (!nextElement) {
                if (cellElement.parentElement.nextElementSibling) {
                    nextElement = cellElement.parentElement.nextElementSibling.firstElementChild;
                } else if (cellElement.parentElement.parentElement.tagName === "THEAD" &&
                    cellElement.parentElement.parentElement.nextElementSibling) {
                    nextElement =
                        cellElement.parentElement.parentElement.nextElementSibling.firstElementChild.firstElementChild;
                } else {
                    nextElement = null;
                }
            }
            if (nextElement) {
                range.selectNodeContents(nextElement);
                range.collapse(true);
            }
            event.preventDefault();
            return true;
        }

        // alt+Backspace：删除行
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.altKey && cellElement.tagName === "TD"
            && event.key === "Backspace") {
            const tbodyElement = cellElement.parentElement.parentElement;
            if (cellElement.parentElement.previousElementSibling) {
                range.selectNodeContents(cellElement.parentElement.previousElementSibling.lastElementChild);
            } else {
                range.selectNodeContents(tbodyElement.previousElementSibling.lastElementChild.lastElementChild);
            }

            if (tbodyElement.childElementCount === 1) {
                tbodyElement.remove();
            } else {
                cellElement.parentElement.remove();
            }

            range.collapse(false);
            event.preventDefault();
            afterRenderEvent(vditor);
            return true;
        }

        // alt+enter: 下方新添加一行 https://github.com/Vanessa219/vditor/issues/46
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.altKey && event.key === "Enter") {
            let rowHTML = "";
            for (let m = 0; m < cellElement.parentElement.childElementCount; m++) {
                rowHTML += `<td>${m === 0 ? "<wbr>" : ""}</td>`;
            }
            if (cellElement.tagName === "TH") {
                cellElement.parentElement.parentElement.insertAdjacentHTML("afterend",
                    `<tbody><tr>${rowHTML}</tr></tbody>`);
            } else {
                cellElement.parentElement.insertAdjacentHTML("afterend", `<tr>${rowHTML}</tr>`);
            }
            setRangeByWbr(vditor.wysiwyg.element, range);
            afterRenderEvent(vditor);
            scrollCenter(vditor.wysiwyg.element);
            event.preventDefault();
            return true;
        }

        // alt+shift+enter: 后方新添加一列
        const tableElement = cellElement.parentElement.parentElement.parentElement as HTMLTableElement;
        if (!event.metaKey && !event.ctrlKey && event.shiftKey && event.altKey && event.key === "Enter") {
            let index = 0;
            let previousElement = cellElement.previousElementSibling;
            while (previousElement) {
                index++;
                previousElement = previousElement.previousElementSibling;
            }
            for (let i = 0; i < tableElement.rows.length; i++) {
                if (i === 0) {
                    tableElement.rows[i].cells[index].insertAdjacentHTML("afterend", "<th></th>");
                } else {
                    tableElement.rows[i].cells[index].insertAdjacentHTML("afterend", "<td></td>");
                }
            }

            afterRenderEvent(vditor);
            event.preventDefault();
            return true;
        }

        // alt+shift+Backspace: 删除当前列
        if (!event.metaKey && !event.ctrlKey && event.shiftKey && event.altKey && event.key === "Backspace") {
            let index = 0;
            let previousElement = cellElement.previousElementSibling;
            while (previousElement) {
                index++;
                previousElement = previousElement.previousElementSibling;
            }
            if (cellElement.previousElementSibling || cellElement.nextElementSibling) {
                range.selectNodeContents(cellElement.previousElementSibling || cellElement.nextElementSibling);
                range.collapse(true);
            }
            for (let i = 0; i < tableElement.rows.length; i++) {
                if (tableElement.rows.length === 1) {
                    tableElement.remove();
                } else {
                    tableElement.rows[i].cells[index].remove();
                }
            }
            afterRenderEvent(vditor);
            event.preventDefault();
            return true;
        }
    }

    const codeRenderElement = hasClosestByClassName(startContainer, "vditor-wysiwyg__block");
    if (codeRenderElement) {
        // esc: 退出编辑，仅展示渲染
        if (event.key === "Escape") {
            vditor.wysiwyg.popover.style.display = "none";
            (codeRenderElement.firstElementChild as HTMLElement).style.display = "none";
            vditor.wysiwyg.element.blur();
            event.preventDefault();
            return true;
        }
        // alt+enter: 代码块切换到语言 https://github.com/Vanessa219/vditor/issues/54
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.altKey && event.key === "Enter" &&
            codeRenderElement.getAttribute("data-type") === "code-block") {
            (vditor.wysiwyg.popover.querySelector(".vditor-input") as HTMLElement).focus();
            event.preventDefault();
            return true;
        }

        // 行级代码块中 command + a，近对当前代码块进行全选
        if (startContainer.parentElement.tagName === "CODE" && codeRenderElement.getAttribute("data-block") === "0") {
            if (processKeymap("⌘-a", event, () => {
                range.selectNodeContents(startContainer.parentElement);
            })) {
                return true;
            }
        }

        // 换行
        if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key === "Enter" &&
            codeRenderElement.getAttribute("data-block") === "0") {
            if (!codeRenderElement.firstElementChild.firstElementChild.textContent.endsWith("\n")) {
                codeRenderElement.firstElementChild.firstElementChild.insertAdjacentText("beforeend", "\n");
            }
            range.insertNode(document.createTextNode("\n"));
            range.collapse(false);
            afterRenderEvent(vditor);
            processCodeRender(codeRenderElement, vditor);
            event.preventDefault();
            return true;
        }

        // tab
        if (event.key === "Tab" && !event.shiftKey && range.collapsed &&
            codeRenderElement.getAttribute("data-block") === "0") {
            range.insertNode(document.createTextNode(vditor.options.tab));
            range.collapse(false);
            afterRenderEvent(vditor);
            processCodeRender(codeRenderElement, vditor);
            event.preventDefault();
            return true;
        }

        // TODO shift + tab, shift and 选中文字

        if (event.key === "Backspace" && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
            const codePosition = getSelectPosition(codeRenderElement, range);
            if (codePosition.start === 0 && range.toString() === "") {
                // Backspace: 光标位于第零个字符，仅删除代码块标签
                codeRenderElement.outerHTML =
                    `<p data-block="0">${codeRenderElement.firstElementChild.firstElementChild.innerHTML}</p>`;
                afterRenderEvent(vditor);
                event.preventDefault();
                return true;
            }
        }
    }

    // 顶层 blockquote
    const topBQElement = hasTopClosestByTag(startContainer, "BLOCKQUOTE");
    if (topBQElement && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.altKey && event.key === "Enter") {
        // alt+enter: 跳出多层 blockquote 嵌套 https://github.com/Vanessa219/vditor/issues/51
        range.setStartAfter(topBQElement);
        setSelectionFocus(range);
        const node = document.createElement("p");
        node.setAttribute("data-block", "0");
        node.innerHTML = "\n";
        range.insertNode(node);
        range.collapse(true);
        setSelectionFocus(range);
        afterRenderEvent(vditor);
        scrollCenter(vditor.wysiwyg.element);
        event.preventDefault();
        return true;
    }

    const blockquoteElement = hasClosestByMatchTag(startContainer, "BLOCKQUOTE");
    if (blockquoteElement && range.collapsed &&
        event.key === "Backspace" && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        if (getSelectPosition(blockquoteElement, range).start === 0) {
            // Backspace: 光标位于引用中的第零个字符，仅删除引用标签
            blockquoteElement.outerHTML = `<p data-block="0">${blockquoteElement.innerHTML}</p>`;
            afterRenderEvent(vditor);
            event.preventDefault();
            return true;
        }
    }

    // h1-h6
    const headingElement = hasClosestByTag(startContainer, "H");
    if (headingElement) {
        if (headingElement.tagName === "H6" && startContainer.textContent.length === range.startOffset &&
            !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.key === "Enter") {
            // enter: H6 回车解析问题 https://github.com/Vanessa219/vditor/issues/48
            const pTempElement = document.createElement("p");
            pTempElement.textContent = "\n";
            pTempElement.setAttribute("data-block", "0");
            startContainer.parentElement.insertAdjacentElement("afterend", pTempElement);
            range.setStart(pTempElement, 0);
            setSelectionFocus(range);
            afterRenderEvent(vditor);
            scrollCenter(vditor.wysiwyg.element);
            event.preventDefault();
            return true;
        }

        // enter++: 标题变大
        if (processKeymap("⌘-=", event, () => {
            const index = parseInt((headingElement as HTMLElement).tagName.substr(1), 10) - 1;
            if (index < 1) {
                return;
            }
            setHeading(vditor, `h${index}`);
            afterRenderEvent(vditor);
            event.preventDefault();
        })) {
            return true;
        }

        // enter++: 标题变小
        if (processKeymap("⌘--", event, () => {
            const index = parseInt((headingElement as HTMLElement).tagName.substr(1), 10) + 1;
            if (index > 6) {
                return;
            }
            setHeading(vditor, `h${index}`);
            afterRenderEvent(vditor);
            event.preventDefault();
        })) {
            return true;
        }
    }

    // li
    const liElement = hasClosestByMatchTag(startContainer, "LI");
    if (liElement) {
        if (!event.metaKey && !event.ctrlKey && event.shiftKey && !event.altKey && event.key === "Enter") {
            if (liElement && !liElement.textContent.endsWith("\n")) {
                // li 结尾需 \n
                liElement.insertAdjacentText("beforeend", "\n");
            }
            range.insertNode(document.createTextNode("\n"));
            range.collapse(false);
            afterRenderEvent(vditor);
            processCodeRender(liElement, vditor);
            event.preventDefault();
            return true;
        }

        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.key === "Backspace" &&
            !liElement.previousElementSibling && range.toString() === "" &&
            getSelectPosition(liElement, range).start === 0) {
            // 光标位于点和第一个字符中间时，无法删除 li 元素
            if (liElement.nextElementSibling) {
                liElement.parentElement.insertAdjacentHTML("beforebegin",
                    `<p data-block="0"><wbr>${liElement.innerHTML}</p>`);
                liElement.remove();
                setRangeByWbr(vditor.wysiwyg.element, range);
            } else {
                liElement.parentElement.outerHTML = `<p data-block="0">${liElement.innerHTML}</p>`;
            }
            afterRenderEvent(vditor);
            event.preventDefault();
            return true;
        }
    }

    // task list
    const taskItemElement = hasClosestByClassName(startContainer, "vditor-task");
    if (taskItemElement) {
        // Backspace: 在选择框前进行删除
        if (event.key === "Backspace" && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
            && range.collapsed && ((startContainer.nodeType === 3 && range.startOffset === 1 &&
                (startContainer.previousSibling as HTMLElement).tagName === "INPUT") ||
                startContainer.nodeType !== 3)) {
            const previousElement = taskItemElement.previousElementSibling;
            taskItemElement.querySelector("input").remove();
            if (previousElement) {
                previousElement.innerHTML += "<wbr>" + taskItemElement.innerHTML.trim();
                taskItemElement.remove();
            } else {
                taskItemElement.parentElement.insertAdjacentHTML("beforebegin",
                    `<p data-block="0"><wbr>${taskItemElement.innerHTML.trim() || "\n"}</p>`);
                if (taskItemElement.nextElementSibling) {
                    taskItemElement.remove();
                } else {
                    taskItemElement.parentElement.remove();
                }
            }
            setRangeByWbr(vditor.wysiwyg.element, range);
            afterRenderEvent(vditor);
            event.preventDefault();
            return true;
        }

        if (event.key === "Enter" && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
            if (taskItemElement.textContent.trim() === "") {
                if (taskItemElement.nextElementSibling) {
                    // 用段落隔断
                    let afterHTML = "";
                    let beforeHTML = "";
                    let isAfter = false;
                    taskItemElement.parentElement.querySelectorAll("li").forEach((taskItem) => {
                        if (taskItemElement.isEqualNode(taskItem)) {
                            isAfter = true;
                        } else {
                            if (isAfter) {
                                afterHTML += taskItem.outerHTML;
                            } else {
                                beforeHTML += taskItem.outerHTML;
                            }
                        }
                    });
                    if (beforeHTML) {
                        beforeHTML = `<ul data-tight="true" data-marker="*" data-block="0">${beforeHTML}</ul>`;
                    }
                    taskItemElement.parentElement.outerHTML = `${beforeHTML}<p data-block="0">\n<wbr></p><ul data-tight="true" data-marker="*" data-block="0">${afterHTML}</ul>`;
                } else {
                    // 变成段落
                    taskItemElement.parentElement.insertAdjacentHTML("afterend", `<p data-block="0">\n<wbr></p>`);
                    if (taskItemElement.parentElement.querySelectorAll("li").length === 1) {
                        taskItemElement.parentElement.remove();
                    } else {
                        taskItemElement.remove();
                    }
                }
            } else {
                // 光标后文字添加到新列表中
                range.setEndAfter(taskItemElement.lastChild);
                taskItemElement.insertAdjacentHTML("afterend", `<li class="vditor-task"><input type="checkbox"> <wbr></li>`);
                document.querySelector("wbr").after(range.extractContents());
            }
            setRangeByWbr(vditor.wysiwyg.element, range);
            afterRenderEvent(vditor);
            scrollCenter(vditor.wysiwyg.element);
            event.preventDefault();
            return true;
        }
    }

    // 删除有子工具栏的块
    if (processKeymap("⌘-⇧-x", event, () => {
        const itemElement: HTMLElement = vditor.wysiwyg.popover.querySelector('[data-type="remove"]');
        if (itemElement) {
            itemElement.click();
        }
    })) {
        return true;
    }

    // 在有子工具栏的块后插入行
    if (processKeymap("⌘-⇧-e", event, () => {
        const itemElement: HTMLElement = vditor.wysiwyg.popover.querySelector('[data-type="insert-after"]')
            || vditor.wysiwyg.popover.querySelector('[data-type="indent"]');
        if (itemElement) {
            itemElement.click();
        }
    })) {
        return true;
    }

    // 在有子工具栏的块前插入行
    if (processKeymap("⌘-⇧-s", event, () => {
        const itemElement: HTMLElement = vditor.wysiwyg.popover.querySelector('[data-type="insert-before"]')
            || vditor.wysiwyg.popover.querySelector('[data-type="outdent"]');
        if (itemElement) {
            itemElement.click();
        }
    })) {
        return true;
    }

    // tab 处理，需放在 cell tab 处理之后
    if (event.key === "Tab") {
        if (event.shiftKey) {
            // TODO shift+tab
        } else {
            if (range.collapsed) {
                range.insertNode(document.createTextNode(vditor.options.tab));
                range.collapse(false);
                if (codeRenderElement) {
                    processCodeRender(codeRenderElement, vditor);
                }
            } else {
                range.extractContents();
                range.insertNode(document.createTextNode(vditor.options.tab));
                range.collapse(false);
            }
        }
        afterRenderEvent(vditor);
        event.preventDefault();
        return true;
    }

    // 软换行
    if (!event.metaKey && !event.ctrlKey && event.shiftKey && !event.altKey && event.key === "Enter") {
        range.insertNode(document.createTextNode("\n"));
        range.collapse(false);
        setSelectionFocus(range);
        afterRenderEvent(vditor);
        scrollCenter(vditor.wysiwyg.element);
        event.preventDefault();
        return true;
    }

    // 删除
    if (event.key === "Backspace" && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
        && range.collapsed) {
        const blockElement = hasClosestByAttribute(startContainer, "data-block", "0");
        if (blockElement && getSelectPosition(blockElement, range).start === 0 && blockElement.previousElementSibling
            && blockElement.previousElementSibling.classList.contains("vditor-wysiwyg__block") &&
            blockElement.previousElementSibling.getAttribute("data-block") === "0"
        ) {
            // 删除后光标落于代码渲染块上
            (blockElement.previousElementSibling.lastElementChild as HTMLElement).click();
            if (blockElement.innerHTML.trim() === "") {
                // 当前块为空且不是最后一个时，需要删除
                blockElement.remove();
                afterRenderEvent(vditor);
            }
            event.preventDefault();
            return true;
        }

        if (startContainer.nodeType !== 3) {
            // 光标位于 table 前，table 前有内容
            const tableElement = startContainer.childNodes[range.startOffset] as HTMLElement;
            if (tableElement && tableElement.tagName === "TABLE" && range.startOffset > 0) {
                range.selectNodeContents(tableElement.previousElementSibling);
                range.collapse(false);
                event.preventDefault();
                return true;
            }
        }
    }

    if (event.key === "Enter") {
        scrollCenter(vditor.wysiwyg.element);
    }

    return false;
};
