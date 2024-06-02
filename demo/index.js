import Vditor from '../src/index'
import '../src/assets/less/index.less'
// import { genAPopover } from "../src/ts/wysiwyg/highlightToolbarWYSIWYG"

// new VConsole()

let toolbar
// if (window.innerWidth < 768) {
    toolbar = [
        'emoji',
        'headings',
        'bold',
        'italic',
        'strike',
        'link',
        '|',
        'list',
        'ordered-list',
        'check',
        'outdent',
        'indent',
        '|',
        'quote',
        'line',
        'code',
        'inline-code',
        'insert-before',
        'insert-after',
        '|',
        'upload',
        'record',
        'table',
        '|',
        'undo',
        'redo',
        '|',
        'edit-mode',
        'content-theme',
        'code-theme',
        'export',
        {"name": "outline", "tipPosition": "s"},
        {
            name: 'more',
            toolbar: [
                'fullscreen',
                'both',
                'preview',
                'info',
                'help',
            ],
        },
        {
            "name": "insert image",
            "tip": "insert image",
            "tipPosition": "s",
            "icon": document.getElementById("previewOnly").innerHTML,
            click() {
                // let path = window.prompt("Please input image URL:");
                // let name = "image";
                // if(path != null && path.length > 0) {
                //     let succFileText = "";
                //     if (vditor && vditor.vditor.currentMode === "wysiwyg") {
                //         succFileText += `\n <img alt=${name} src="${path}">`;
                //     } else {
                //         succFileText += ` \n![${name}](${path})`;
                //     }
                //     document.execCommand("insertHTML", false, succFileText);
                // }

                let html = "<p><img height='100' src='https://froala.com/wp-content/uploads/2021/06/froala-1.svg' width='100'/> <font color='red'>红色</font></p>";
                // html = "<div><img src='https://froala.com/wp-content/uploads/2021/06/froala-1.svg'  title='hello' width='100px' height='32px' ></div>\n";
                // document.execCommand("insertHTML", true, html);
                // window.vditor.insertValue(html, false);
                // _insertImage();
                window.vditor.insertHTMLCode(html);
                // document.execCommand("insertHTML", false,
                //     html.replace(/&/g, "&amp;").replace(/</g, "&lt;"));
            }
        }
    ]


// }
const initVditor = (language) => {
    window.vditor = new Vditor('vditor', {
        // _lutePath: `http://192.168.31.194:9090/lute.min.js?${new Date().getTime()}`,
        _lutePath: 'src/js/lute/lute.min.js',
        cdn: '',
        toolbar,
        lang: language,
        mode: 'wysiwyg',
        height: window.innerHeight + 100,
        outline: {
            enable: true,
            position: 'right',
            after(show) {
                console.log("Outline show = " + show);
            }
        },
        debugger: true,
        typewriterMode: true,
        placeholder: 'Hello, Vditor!',
        preview: {
            markdown: {
                toc: true,
                mark: true,
                footnotes: true,
                autoSpace: true,
            },
            math: {
                engine: 'KaTeX',
                inlineDigit: true,
            },
        },
        toolbarConfig: {
            pin: true,
        },
        counter: {
            enable: true,
            type: 'text',
        },
        hint: {
            emojiPath: 'https://cdn.jsdelivr.net/npm/vditor@1.8.3/dist/images/emoji',
            emojiTail: '<a href="https://ld246.com/settings/function" target="_blank">设置常用表情</a>',
            emoji: {
                'sd': '💔',
                'j': 'https://cdn.jsdelivr.net/npm/vditor@1.3.1/dist/images/emoji/j.png',
            },
            parse: false,
            extend: [
                {
                    key: '@',
                    hint: (key) => {
                        console.log(key)
                        if ('vanessa'.indexOf(key.toLocaleLowerCase()) > -1) {
                            return [
                                {
                                    value: '@Vanessa',
                                    html: '<img src="https://avatars0.githubusercontent.com/u/970828?s=60&v=4"/> Vanessa',
                                }]
                        }
                        return []
                    },
                },
                {
                    key: '#',
                    hint: (key) => {
                        console.log(key)
                        if ('vditor'.indexOf(key.toLocaleLowerCase()) > -1) {
                            return [
                                {
                                    value: '#Vditor',
                                    html: '<span style="color: #999;">#Vditor</span> ♏ 一款浏览器端的 Markdown 编辑器，支持所见即所得（富文本）、即时渲染（类似 Typora）和分屏预览模式。',
                                }]
                        }
                        return []
                    },
                }],
        },
        tab: '\t',
        upload: {
            accept: 'image/*,.mp3, .wav, .rar',
            token: 'test',
            url: '/api/upload/editor',
            linkToImgUrl: '/api/upload/fetch',
            filename(name) {
                return name.replace(/[^(a-zA-Z0-9\u4e00-\u9fa5\.)]/g, '').replace(/[\?\\/:|<>\*\[\]\(\)\$%\{\}@~]/g, '').replace('/\\s/g', '')
            },
        },

        // 单击即可编辑的功能
        link: {
            isOpen : false,
            click : ( element) => {
                console.log("click");
                element.focus();
                var range = element.ownerDocument.createRange();
                range.setStart(element, 0);
                range.setEnd(element, 1);
                range.collapse(true);
                // 应用选择
                // document.getSelection().removeAllRanges();
                // document.getSelection().addRange(range);
                console.debug(window.vditor);
                window.vditor.trigLinkEditor(element, range);
            }
        }
    })
}
initVditor('zh_CN')
window.setLang = (language) => {
    window.vditor.destroy()
    initVditor(language)
}
