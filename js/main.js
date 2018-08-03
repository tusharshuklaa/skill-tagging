// Creating namespaces
// Feel free to change this "ProjectNameSpace" to your project name and update all references
const ProjectNameSpace = {
    SkillTagging: {},
    Utils: {},
    TSHorizontalScroll: {},
    TSTextToList: {},
    TagBox: {},
    TSAutoComplete: {},
    LSD: {},
    Skills: {}
};

//#region Loader Class

/**
 * Use this class to insert a loader in any DOM element
 * Can show a message, a loading icon or both at once
 * @class LoaderOnElem
 */
class LoaderOnElem {
    /**
     *Creates an instance of LoaderOnElem.
        * @param {{jqElem: jQueryElement, showMessage: boolean, showIcon: boolean}} config
        * @memberof LoaderOnElem
        */
    constructor(config) {
        this.parentElem = config.jqElem;
        this.showMessage = config.showMessage;
        this.showIcon = config.showIcon;
        this.setMessage("Loading..");
    }

    setMessage(msg) {
        this.loadingMessage = msg;
    }

    getLoaderHtml() {
        const lMsg = this.showMessage ? "<span class=\"loaderMsg\">" + this.loadingMessage + "</span>" : "";
        const lIcon = this.showIcon ? "<br><span class=\"loadIcon\"><i class=\"fa fa-circle-o-notch fa-spin\"></i></span>" : "";
        const h = this.parentElem.outerHeight(true);
        const w = this.parentElem.outerWidth(true);
        const offset = this.parentElem.offset();
        let fs = 100 < w && w < 400 ? 16 : 20;
        return `<div class="tsLoader" style="font-size: ${fs}px; height: ${h}px; width: ${w}px; top: ${offset.top}px; left: ${offset.left}px"> ${lMsg} ${lIcon} </div>`;
    }

    show() {
        this.parentElem.append(this.getLoaderHtml());
    }

    remove() {
        this.parentElem.find(".tsLoader").remove();
    }

    toggle() {
        ($(".tsLoader")).length > 0 ? this.remove() : this.show();
    }
}

//#endregion

//#region Bootstrap confirm modal

class Confirmation {
    constructor() {
        this._ref = {
            confirm: "_confirmation_confirm",
            abort: "_confirmation_abort",
            modal: "_confirmation_modal"
        };
    }

    destroyHandlers() {
        $("body").off("click", "#" + this._ref.confirm, this._confirm)
        .off("click", "#" + this._ref.abort, this._abort);

        function cleanUp() {
            $(".modal-backdrop").remove();
            $("body").removeClass("modal-open");
        }

        cleanUp();
    }

    show(heading, desc) {
        const _modal = this.modalHtml(heading, desc);
        $("body").append(_modal);
        $("#" + this._ref.modal).modal();
    }

    modalHtml(heading, desc) {
        heading = heading && heading.length > 0 ? heading : "";
        desc = desc && desc.length > 0 ? `<div class="modal-body"><p>${desc}</p><div>` : "";
        return "" + 
        `<div class="modal fade" tabindex="-1" role="dialog" aria-labelledby="confirmation modal" aria-hidden="true" id="${this._ref.modal}">
            <div class="modal-dialog modal-sm">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                        <h4 class="modal-title" id="myModalLabel"> ${heading} </h4>
                    </div>
                    ${desc}
                    <div class="modal-footer">
                        <button type="button" class ="btn btn-default" id="${this._ref.confirm}">Confirm</button>
                        <button type="button" class="btn btn-primary" data-dismiss="modal" id="${this._ref.abort}">Cancel</button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    confirm(onConfirm) {
        if (onConfirm) {
            $("body").one("click", "#" + this._ref.confirm, (ev) => {
                ev.preventDefault();
                this._confirm(onConfirm);
            })
        } else {
            console.error("onConfirm is not defined");
        }
    }

    _confirm(onConfirm) {
        onConfirm(true);
        this.hide();
    }

    abort(onAbort) {
        onAbort = onAbort ? onAbort : function() {};
        $("body").on("click", "#" + this._ref.abort, (e) => {
            e.preventDefault();
            this._abort(onAbort);
        });
    }

    _abort(onAbort) {
        onAbort(false);
        this.hide();
    }

    hide() {
        $("#" + this._ref.modal).modal("hide").promise().done(() => {
            this.destroyHandlers();
            $("#" + this._ref.modal).remove();
        });
    }
}

//#endregion

//#region AutoComplete Plugin

class TSSuggest {
    constructor(params) {
        this.elem = params.elem;
        this.dispProp = params.dispProp;
        this.valProp = params.valProp;
        this.data = params.data;
        this.action = params.action ? params.action : function () {};
        this.onSelect = params.onSelect ? params.onSelect : function () {};
        this.id = params.elem[0].id ? params.elem[0].id : "acl";
        this.msg = params.action ? "" : "Either no item has been tagged or all of them are visible. Only removed skill tags will show here for re-addition"
    }

    init() {
        const elm = this.elem;
        const self = this;
        elm.on("input", function (ev) {
            self._initAutoComplete(this, ev);
        }).on("keydown", function (ev) {
            self._manageAcVal(ev);
        });

        const acParent = elm.parent();

        acParent.on("click", ".autocomplete-list-item", function () {
            const inputElem = $(this).find("input");
            const selectedItem = inputElem.val();
            if (selectedItem) {
                elm.val(selectedItem);
                elm.data("itemId", inputElem.data("itemId"));
                self.onSelect();
            }
        }).on("click", "." + this.acClass.createSkill, (e) => {
            self.action(e);
        });

        $(document).on("click", (e) => {
            this._closeAllLists(e.target);
        });
    }

    _initAutoComplete(self, ev) {
        let acTxt = self.value;
        this._closeAllLists();
        if (!acTxt) {
            return false;
        }
        this._cf = -1;
        const aclem = this._makeAcHtml(acTxt);
        this.elem.after(aclem);
    }

    _makeAcHtml(acTxt) {
        const eDim = this._getElemDimensions();
        let aclem = `<div id="${this.id}-ac-list" style="top:${eDim.h}; width:${eDim.w}" class="${this.acClass.parent}">`;
        let foundAtLeastOne = false;
        if (this.data && this.data.length > 0) {
            this.data.forEach((i) => {
                let dt = i.name;
                const indx = dt.toUpperCase().indexOf(acTxt.toUpperCase());
                if (indx > -1) {
                    aclem = aclem + "<div class=\"" + this.acClass.child + "\">" + dt.substring(0, indx) +
                        "<strong>" + dt.substring(indx, indx + acTxt.length) +
                        "</strong>" + dt.substring(indx + acTxt.length, dt.length) +
                        "<input type=\"hidden\" data-item-id=\"" + i.id + "\" value=\"" + dt + "\" /></div>";
                    if (!foundAtLeastOne) {
                        foundAtLeastOne = true;
                    }
                }
            });
        }
        if (!foundAtLeastOne) {
            const btn = "<button id=\"createSkill\" data-tag-name=\"" + acTxt + "\" class=\"btn btn-success btn-xs " +
                this.acClass.createSkill + "\">Create <strong>" + acTxt + "</strong>?</button>";
            aclem = aclem + "<div class=\"ac-not-found " + this.acClass.child + "\">" +
                "<strong>Not Found!</strong><br> " + (this.msg && this.msg !== "" ? this.msg : btn);
        }
        aclem = aclem + "</div>";
        return aclem;
    }

    _getElemDimensions() {
        const elm = this.elem;
        const offset = elm.offset();
        return {
            h: offset.top + elm.outerHeight() + 2 + "px",
            w: elm.outerWidth() + "px"

        };
    }

    _closeAllLists() {
        $("#" + this.id + "-ac-list").remove();
    }

    _manageAcVal(e) {
        let x = $("#" + this.id + "-ac-list");
        if (x && x.length > 0) {
            x = x.children("div");

            const key = e.keyCode;
            if (key === 40) {
                // Down arrow key
                this._cf++;
                this._addActive(x);
            }

            if (key === 38) {
                // Up arrow key
                this._cf--;
                this._addActive(x);
            }

            if (key === 13) {
                // Enter arrow key
                e.preventDefault();
                if (this._cf > -1) {
                    /*and simulate a click on the "active" item:*/
                    $(x[this._cf]).trigger("click");
                }
            }
        }
    }

    _addActive(x) {
        if (!x) return false;
        /*start by removing the "active" class on all items:*/
        this._removeActive(x);
        this._cf = this._cf >= x.length ? 0 : (this._cf < 0 ? x.length - 1 : this._cf);
        /*add class "autocomplete-active":*/
        x[this._cf].classList.add(this.acClass.child + "-active");
    }

    _removeActive(x) {
        for (var i = 0; i < x.length; i++) {
            x[i].classList.remove(this.acClass.child + "-active");
        }
    }
}

TSSuggest.prototype.acClass = {
    parent: "ts-autocomplete",
    child: "autocomplete-list-item",
    createSkill: "create-skill"
};


//#endregion

//#region Local Storage Data Plugin
(function (lsd, u) {
    "use strict";

    // 30 minutes
    let _expiry = 30 * 60000;
    const __separator = "-:-";
    const ls = localStorage;

    const setLS = function (prop, val, prefix = "ts") {
        _validateSet(prop, val);
        _deleteAllData(prop, prefix);
        const value = _getVal(val);
        _setLSVal(prop, value, prefix);
    };
    /**
     * Use this function to get local storage data by property name
     * You can also pass optional prefix which should check for prefix as well in property name
     * @param {string} prop
     * @param {string} [prefix="ts"]
     * @returns {String}
     */
    const getLS = function (prop, prefix = "ts") {
        const propStorage = _getPropLSItems(prop, prefix);
        const _keys = Object.keys(propStorage);
        if (_keys.length > 0) {
            const X = _getTimeForProp(prop, prefix);
            let latestKey = _keys.reduce((p, c) => {
                return (X(p) > X(c)) ? p : c;
            });
            const latestTime = X(latestKey);
            if (latestTime > u.getTimeInMS()) {
                return propStorage[latestKey];
            }
        }
        return null;
    };

    const _getTimeForProp = function (prop, prefix) {
        return function (key) {
            return parseInt(key.replace(prefix, "").replace(new RegExp(__separator, 'g'), "").replace(prop, ""));
        };
    };

    /**
     * Set the expiration time of local storage data.
     * Null or undefined parameter sets expiry to default i.e. 30 minutes
     * @param {Time} expiry In Minutes
     */
    const setLSExpiry = function (expiry) {
        _expiry = expiry ? 60000 * expiry : _expiry;
    };

    const _deleteAllData = function (prop, prefix) {
        const propStorage = _getPropLSItems(prop, prefix);
        const _keys = Object.keys(propStorage);
        if (_keys.length > 0) {
            _keys.forEach((k) => {
                ls.removeItem(k);
            });
        }
    };

    /**
     * If a property in localstorage has multiple versions
     * then use this function to get them all
     * @param {string} prop
     * @param {string} startsWith
     * @returns {Object} { localStorageKey: value }
     */
    const _getPropLSItems = function (prop, startsWith) {
        return Object.keys(ls).reduce((accumulator, k) => {
            if (k.indexOf(prop) > -1) {
                if (typeof startsWith === "undefined" || startsWith === null || !startsWith) {
                    accumulator[k] = ls[k];
                } else {
                    if (k.indexOf(startsWith) === 0) {
                        accumulator[k] = ls[k];
                    }
                }
            }
            return accumulator;
        }, {});
    };

    const _setLSVal = function (prop, val, prefix) {
        const tTime = u.getTimeInMS() + _expiry;
        const key = prefix + __separator + tTime + __separator + prop;
        ls.setItem(key, val);
    }

    const _getVal = function (x) {
        return (typeof x === "string" || typeof x === "number") ? x.toString() :
            (typeof x === "object" ? JSON.stringify(x) : x);
    };

    const _validateSet = function (prop, val) {
        if (!prop || !val) {
            console.error("Undefined property name or value", {
                prop,
                val
            });
            return;
        }
    }

    lsd.set = setLS;
    lsd.get = getLS;
    lsd.expiry = setLSExpiry;
})(ProjectNameSpace.LSD,
    ProjectNameSpace.Utils);

//#endregion

//#region Utility functions
(function (u) {
    "use strict";

    // Check if the pressed key is ENTER key
    const isEnterKey = function (e) {
        const k = e.which || e.keyCode || e.key;
        return k === 13 || k === "Enter";
    };

    const isRoman = function(s) {
        s = s.toUpperCase();
        const x = new RegExp(/^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/gm);
        return x.test(s);
    }

    const getMultiLineArr = function (s) {
        const self = this;
        // A separator to determine line breaks for strings items
        const separator = "_|--|_";
        //Ordered list type  )--> ( --> represents TAB)
        const ulWithParan = String.fromCharCode(41) + String.fromCharCode(9);
        //Ordered list type  .-->
        const ulWithDot = String.fromCharCode(46) + String.fromCharCode(9);

        function replaceUlPart(s) {
            const indxOfDot = s.indexOf(ulWithDot);
            const indxOfParan = s.indexOf(ulWithParan);
            let exprsn = indxOfDot > -1 ? /.\t/ : (indxOfParan > -1 ? /.\)/ : /(?:)/);
            // If any of above regex passes then remove matched item from string
            if (!!~indxOfDot || !!~indxOfParan) {
                const regxp = new RegExp(exprsn, "gm");
                s = s.replace(regxp, separator);
            }
            
            const firstSeparator = s.indexOf(separator);
            // Removing first UL element if its just the bullet
            if (firstSeparator > -1 && firstSeparator < 2) {
                s = s.substr((firstSeparator + separator.length), s.length);
                console.log(s);
            }

            const q = s.split(separator);
            if(q && q.length > 0) {
                q.forEach((w, i, all) => {
                    const lastSpaceIndx = w.lastIndexOf(" ");
                    if (lastSpaceIndx > -1) {
                        const lastWord = w.substr((lastSpaceIndx + 1), w.length);
                        console.log("lastWord", lastWord);
                        if (lastWord.length < 3) {
                            // Support for any numeral or Ordered List item with 2 strings such as 99 or A1
                            all[i] = w.replace(lastWord, "");
                        } else {
                            // Support for roman numbers upto 999
                            if (lastWord.length < 7) {
                                const isRoman = self.isRoman(lastWord);
                                if (isRoman) {
                                    all[i] = w.replace(lastWord, "");
                                }
                            }
                        }
                    }
                });
            }

            s = q.join(separator);
            return s;
        }

        s = replaceUlPart(s);

        // RegEx for non-keyboard characters
        const keyBoardKeys = new RegExp(/[^ A-Za-z0-9.,?'"!@#$%^&*()-_=+;:<>/\\|}{[\]`~]/g);
        // Regex for new line, carriage return and other forms of whitespace
        const newLineRule = new RegExp(/(\r\n|\n|\r|\f|\t|\v| (?= ))/g);
        let x = s.replace(keyBoardKeys, separator);
        x = x.replace(newLineRule, separator);
        let a = x && x.length > 0 ? x.split(separator) : null;
        // Removing extra whitespace 
        console.log("Separated string", a);
        let b = a.filter(i => (!!i && i !== "" && i !== " "));
        console.log("Filtered Separated string", b);
        this.readChars(s);
        return b;
    };

    const readChars = function(s) {
        const x = s.split("");
        if(x && x.length > 0) {
            x.forEach((z) => {
                console.log("character: |" + z + "| ", "--> charCode: |" + z.charCodeAt(0) + "|" );
            });
        }
    }

    const getElem = function (e) {
        const x = e.target || e.srcElement;
        return x ? $(x) : (() => {
            console.error("No element found for event", e);
            return false;
        })();
    };

    const isElemOverflowing = function (elem) {
        const curOverflow = elem.style.overflow;
        if (!curOverflow || curOverflow === "visible") {
            elem.style.overflow = "hidden";
        }
        const isOverflowing = elem.clientWidth < elem.scrollWidth || elem.clientHeight < elem.scrollHeight;
        elem.style.overflow = curOverflow;
        return isOverflowing;
    };

    const isValid = function (item) {
        return !!item && item !== "" && item.length > 0;
    };

    const spoofAsync = function (data, ms) {
        var d = $.Deferred();
        setTimeout(function () {
            d.resolve(data);
        }, ms);
        return d.promise();
    };

    const getTimeInMS = function () {
        const d = new Date();
        return d.getTime();
    };

    const replaceAll = function (str, find, replace) {
        return str.replace(new RegExp(find, 'g'), replace);
    }

    const observableArray = function (array) {
        return new Proxy(array, {
            apply: function (target, thisArg, argumentsList) {
                return thisArg[target].apply(this, argumentsList);
            },
            deleteProperty: function (target, property) {
                console.log("Deleted %s", property);
                return true;
            },
            set: function (target, property, value, receiver) {
                target[property] = value;
                console.log("Set %s to %o", property, value);
                return true;
            }
        });
    };

    // Public functions
    u.isEnterKey = isEnterKey;
    u.getMultiLineArr = getMultiLineArr;
    u.getJqElem = getElem;
    u.isElemOverflowing = isElemOverflowing;
    u.isValid = isValid;
    u.spoofAsync = spoofAsync;
    u.getTimeInMS = getTimeInMS;
    u.replaceAll = replaceAll;
    u.OArray = observableArray;
    u.readChars = readChars;
    u.isRoman = isRoman;
})(ProjectNameSpace.Utils);

//#endregion

//#region Text To List Plugin

(function (ttl, u) {
    "use strict";

    const ref = {
        skillTxt: "skillItemText",
        delIcon: "fa-close",
        saveIcon: "fa-check",
        bulletIcon: "checkbox",
        listInput: "#listItemsInput",
        skillList: ".skillListArea"
    };

    let _data = {
        ul: null,
        allItems: [],
        isInlineSave: false,
        scrollLeftPrev: 0,
        onBulletClick: null
    };

    /**
     * Make table
     * @param {*} ".myList" (class/Id DOM reference)
     */
    const init = function (config) {
        _data.ul = _assignToPriv(config.listElem);
        _data.onBulletClick = _assignToPriv(config.bulletClick);
        initHandlers();
    };

    const _assignToPriv = function (item, msg) {
        msg = msg ? msg : "Problem encountered while reading config! "
        return item ? item : (() => {
            console.error(msg, item);
            return;
        })();
    };

    const initHandlers = function () {
        $(_data.ul).on("blur", "." + ref.skillTxt, (e) => {
            _checkUnsavedVal(e);
        }).on("click", "." + ref.delIcon, (e) => {
            _deleteItem(e);
        }).on("mousedown", "." + ref.saveIcon, (e) => {
            _initInlineSave(e);
        }).on("click", "." + ref.bulletIcon, (e) => {
            _data.onBulletClick(e);
        });
    };

    const _isPluginConfigured = function () {
        return u.isValid(_data.ul);
    };

    const initMakeList = function (txt) {
        if (!_isPluginConfigured()) {
            console.error("Configure with list DOM element reference first");
            return;
        }

        const listText = txt.trim();
        let allItems = u.getMultiLineArr(listText);
        if (allItems && allItems.length > 0) {
            makeList(allItems);
        } else {
            console.warn("Invalid list text", listText);
        }
    };

    const makeList = function (items) {
        let mi = _makeMapObject(items);
        _update(mi);
    };

    const _update = function (allItems) {
        _updateAllItems(allItems);
        appendListToUi();
    };

    const _makeMapObject = function (items) {
        return items.map((a, i) => _getMappedObj(a, i, _data.allItems.length));
    };

    const _getMappedObj = function (a, i, id) {
        const unikNum = u.getTimeInMS() + i;
        return {
            uid: `sp${id + unikNum}`,
            skill: {
                id: null,
                name: null
            },
            item: a
        }
    };

    const _updateAllItems = function (arrObj) {
        _data.allItems.push(...arrObj);
    };

    const appendListToUi = function (items) {
        if (!items) {
            items = getAllItems();
        }
        if (items && items.length > 0) {
            // sort list
            _sortAllItems(items);
            let list = "";
            items.forEach((i) => {
                let li = _getListItem(i);
                list = list + li;
            });
            $(_data.ul).html(list);
        } else {
            console.warn("No ITEMS found", items);
        }
    };

    const _sortAllItems = function (items) {
        if (items && Object.keys(items).length > 0) {
            items.sort((a, b) => {
                const aId = parseInt((a.uid).replace("sp", ""));
                const bId = parseInt((b.uid).replace("sp", ""));
                return aId - bId;
            });
        }
    };

    const _getListItem = function (i) {
        const isChecked = i.skill.id ? "tagged" : "";
        const skillName = isChecked ? i.skill.name : "";
        const skillId = isChecked ? i.skill.id : "";
        return "" +
        `<li data-uid="${i.uid}">
            <div class="itemRow">
            <div class="${ref.bulletIcon} ${isChecked} checkbox-primary checkbox-circle">
                <input type="checkbox" value="${i.uid}" data-skill-id="${skillId}" data-skill-name="${skillName}">
                <label></label>
                </div>
                <input class="${ref.skillTxt}" type="text" data-orig-val="${i.item}" value="${i.item}" />
                <i class="fa ${ref.saveIcon}" title="Save"></i>
                <i class="fa ${ref.delIcon}" title="Remove item"></i>
            </div>
        </li>`;
    };

    const _checkUnsavedVal = function (e) {
        const elem = u.getJqElem(e);
        if (elem) {
            const origSkillData = elem.data("origVal");
            const skillVal = elem.val();
            if (_data.isInlineSave) {
                _updateInlineItem(elem);
                _data.isInlineSave = false;
            } else {
                if (origSkillData !== skillVal) {
                    elem.val(origSkillData);
                }
            }
        }
    };

    const _initInlineSave = function (e) {
        e.preventDefault();
        const elem = u.getJqElem(e);
        const parentLi = elem.parents("li");
        _data.isInlineSave = true;
        parentLi.find("." + ref.skillTxt).blur();
    };

    const _updateInlineItem = function (elem) {
        const parentLi = elem.parents("li");
        if (parentLi && parentLi.length > 0) {
            const uid = parentLi.data("uid");
            let itemToUpdate = _data.allItems.find(i => i.uid === uid);
            itemToUpdate.item = elem.val();
            elem.data("origVal", itemToUpdate.item);
        }
    };

    const _deleteItem = function (e) {
        const elem = u.getJqElem(e);
        const parentLi = elem.parents("li");
        if (parentLi && parentLi.length > 0) {
            const uid = parentLi.data("uid");
            const tempArr = _data.allItems.filter(a => a.uid !== uid);
            _data.allItems.length = 0;
            _update(tempArr);
        }
    };

    const getAllItems = function () {
        return _data.allItems;
    };

    const getAllTagged = function () {
        return _data.allItems.filter((ai) => {
            return !!ai.skill.id;
        });
    };

    const disable = function () {
        $("." + ref.skillTxt).attr("disabled", "disabled");
        $(ref.listInput).attr("disabled", "disabled");
        $(ref.skillList).addClass("addDisabled");
    };

    const enable = function () {
        $("." + ref.skillTxt).removeAttr("disabled");
        $(ref.listInput).removeAttr("disabled");
        $(ref.skillList).removeClass("addDisabled");
    };

    const untagSkill = function (skillId) {
        _data.allItems.forEach((item) => {
            if(!!item.skill.id && item.skill.id === skillId) {
                item.skill.name = null;
                item.skill.id = null;
            }
        });
    };

    ttl.init = init;
    ttl.makeList = initMakeList;
    ttl.update = makeList;
    ttl.getAllItems = getAllItems;
    ttl.disable = disable;
    ttl.enable = enable;
    ttl.refreshUi = appendListToUi;
    ttl.getAllTagged = getAllTagged;
    ttl.untagSkill = untagSkill;

})(ProjectNameSpace.TSTextToList, ProjectNameSpace.Utils);

//#endregion

//#region Skills

(function (skills, utility, locStorage, txtToList, hScroll, tagBox) {
    "use strict";

    const tempData = [
        {
        name: "Java",
        id: "1"
    }, {
        name: "JavaScript",
        id: "2"
    }, {
        name: "CSS",
        id: "3"
    }, {
        name: "SCSS",
        id: "4"
    }, {
        name: "LESS",
        id: "5"
    }, {
        name: "Angular",
        id: "6"
    }, {
        name: "React",
        id: "7"
    }, {
        name: "Go",
        id: "8"
    }, {
        name: "Python",
        id: "9"
    }, {
        name: "Dot Net",
        id: "10"
    }, {
        name: "C++",
        id: "11"
    }, {
        name: "C#",
        id: "12"
    }, {
        name: "Project Management",
        id: "13"
    }, {
        name: "Microsoft Office",
        id: "14"
    }, {
        name: "SQL",
        id: "15"
    }, {
        name: "Mongo",
        id: "16"
    }, {
        name: "Node JS",
        id: "17"
    }, {
        name: "Ruby",
        id: "18"
    }];

    let allSkills = [];

    const ref = {
        createSkillBtn: "#createSkill",
        skillPillsArea: "#skillTagsWithIcon",
        skillBox: "skillBox",
        active: "selectedTag",
        removeSkill: "skill-remove"
    };

    const lsSkillProp = "skills";

    const init = function () {
        initHandlers();
        initHScroll();
    };

    const initHandlers = function () {
        $(ref.skillPillsArea).on("click", "." + ref.skillBox, function (e) {
            selectPill(e);
        }).on("click", "." + ref.removeSkill, function (e) {
            removePill(e);
        });
    };

    const initHScroll = function () {
        hScroll.init({
            parent: $(ref.skillPillsArea),
            scrollAreaClass: "skillTags"
        });
    };

    const removePill = function (e) {
        e.preventDefault();
        e.stopPropagation();
        const confirm = new Confirmation();
        confirm.show("Are you sure?", 
        "This would completely untag all items tagged with this tag. This action cannot be undone.");
        confirm.confirm(function() {
            const elm = utility.getJqElem(e);
            const skillBox = elm.closest("." + ref.skillBox);
            const skillId = skillBox.data("skillId");
            skillBox.remove();
            txtToList.untagSkill(skillId);
            _showTagItems();
        });
    };

    const selectPill = function (e) {
        e.preventDefault();
        e.stopPropagation();
        const elm = utility.getJqElem(e);
        const skillBox = elm.closest("." + ref.skillBox);
        const isSelected = skillBox.hasClass(ref.active);
        if (isSelected) {
            skillBox.removeClass(ref.active);
        } else {
            skillBox.addClass(ref.active);
        }
        _showTagItems();
    };

    const _showTagItems = function () {
        // Get SELECTED TAGS first, selected tags have highest priority for being visible
        let chosenSkills = _getActivePills();
        let allowUntagged = false;
        // Get all list items
        const allItems = txtToList.getAllItems();
        // If there are no selected tags then get ALL TAGS 
        if (!chosenSkills || Object.keys(chosenSkills).length <= 0) {
            chosenSkills = _getSkillsMap();
            allowUntagged = true;
        }
        // Filter items based on chosen skills
        const itemsToShow = allItems.filter((i) => {
            let condition = false;
            if (allowUntagged) {
                condition = "undefined" === typeof i.skill.id || null === i.skill.id;
            }
            // If a skill with valid ID exists or allowUnTagged === true then item is to be displayed
            if (chosenSkills[i.skill.id] || condition) {
                return i;
            }
        });
        txtToList.refreshUi(itemsToShow);
    };

    const getTagged = function () {
        const taggedItems = txtToList.getAllTagged();
        allSkills = allSkills.filter(s => s.id !== null);
        return taggedItems.reduce((acc, i) => {
            const isPresent = !!~acc.findIndex(a => a.id === i.skill.id);
            if (!isPresent) {
                acc.push(i.skill);
            }
            return acc;
        }, allSkills);
    };

    // const _getVisible = function () {
    //     const tagged = getTagged();
    //     return tagged.filter(x => !~removedSkills.findIndex((s) => {
    //         return s.id === x.id;
    //     }));
    // };

    const _getSkillsMap = function() {
        const tagged = getTagged();
        let _temp = {};
        tagged.forEach((i) => {
            _temp[i.id] = i.name;
        });
        return _temp;
    };

    // const _getVisibleMap = function () {
    //     const visible = _getVisible();
    //     let _temp = {};
    //     visible.forEach((i) => {
    //         _temp[i.id] = i.name;
    //     });
    //     return _temp;
    // };

    const _getPills = function (elems) {
        let tempHash;
        if (elems && elems.length > 0) {
            tempHash = {};
            elems.each((i) => {
                const _data = $(elems[i]).data();
                tempHash[_data.skillId] = _data.skillName;
            });
        }
        return tempHash;
    };

    const _getActivePills = function () {
        return _getPills($("." + ref.active));
    };

    const fetch = function (loaderElem) {
        //make ajax call to get skills from DB
        // const dbCall = $.ajax({
        //     url: "/someurl",
        //     method: "GET",
        //     data: {
        //         a: "a"
        //     }
        // });
        loaderElem = loaderElem ? loaderElem : $("body");
        const loader = new LoaderOnElem({
            jqElem: loaderElem,
            showMessage: true,
            showIcon: true
        });
        loader.show();

        const localData = locStorage.get(lsSkillProp);
        if (localData) {
            // convert local storage data (string) to array
            const temp = JSON.parse(localData);
            tagBox.updateAutoComplete(temp);
            loader.remove();
        } else {
            _dbCallFetch(loader);
        }
    };

    const create = function () {
        const skillName = $(ref.createSkillBtn).data("tagName");
        _dbCallCreate(skillName).promise().done(() => {
            tagBox.refreshAc();
        });
    };

    const _dbCallCreate = function (item) {
        //make ajax call to save skill to DB
        // const dbCall = $.ajax({
        //     url: "/someurl",
        //     method: "POST",
        //     data: {
        //         a: "a"
        //     }
        // });
        const loader = new LoaderOnElem({
            jqElem: $("body"),
            showMessage: true,
            showIcon: true
        });
        loader.show();

        // temp stuff
        const newSkill = {
            name: item,
            id: tempData.length
        };
        //not required when actual db calls are to be made
        tempData.push(newSkill);
        // this db call should hit CREATE SKILL API and return all SKILLS
        const dbCall = utility.spoofAsync(tempData, 3000);
        // temp stuff end
        return _dbCallDone(dbCall, loader).promise().done(() => {
            allSkills.filter(s => s.id !== null).push(newSkill);
        });
    }

    const _dbCallFetch = function (loader) {
        // Below tempData is just for testing purpose, this would be replaced by actual response from server in promise chain below
        const dbCall = utility.spoofAsync(tempData, 3000);
        _dbCallDone(dbCall, loader);
    };

    const _dbCallDone = function (dbCall, loader) {
        return dbCall.then((res) => {
            // feed this data to jQuery auto complete
            locStorage.set(lsSkillProp, res);
            tagBox.updateAutoComplete(res);
        }).fail((err) => {
            console.warn("DB Call failed with error: ", err);
        }).always(() => {
            // run this no matter success or failure
            loader.remove();
        });
    };

    // const getSkills = function (inUse) {
    //     return inUse ? allSkills : removedSkills;
    // };

    const get = function (id) {
        let skills = locStorage.get(lsSkillProp);
        if (skills) {
            skills = JSON.parse(skills);
            const skill = skills.find((s) => {
                return s.id === id;
            });
            return skill ? skill : false;
        }
        return false;
    };

    const makePills = function (scrollToEnd) {
        const visibleSkills = getTagged();
        if (visibleSkills && visibleSkills.length > 0) {
            let skillPills = "";
            visibleSkills.forEach((s) => {
                if (s.id && s.id !== null) {
                    skillPills = skillPills +
                    `<div class="${ref.skillBox}" data-skill-name="${s.name}" data-skill-id="${s.id}">
                        <span>${s.name}</span>
                        <i class="fa fa-close ${ref.removeSkill}"></i>
                    </div>`;
                }
            });
            hScroll.makeContent(skillPills, scrollToEnd);
        }
    };

    skills.init = init;
    skills.fetch = fetch;
    skills.create = create;
    skills.get = get;
    skills.makePills = makePills;
    skills.getSkillsMap = _getSkillsMap;

})(ProjectNameSpace.Skills,
    ProjectNameSpace.Utils,
    ProjectNameSpace.LSD,
    ProjectNameSpace.TSTextToList,
    ProjectNameSpace.TSHorizontalScroll,
    ProjectNameSpace.TagBox);

//#endregion

//#region Tag Box

(function (tb, skills, ttl) {
    "use strict";

    const _ref = {
        apply: "#applyTag",
        cancel: "#cancelTag",
        actionBtns: ".tagActions",
        skillSearchBox: "#skillSearchBox",
        tagBox: ".tagItemsToSkill",
        itemRow: ".itemRow",
        tagItemCountBox: "#tagItems",
        tagMsg: "#tagMsg"
    };

    let selectedItems = [];
    let ac;

    const init = function () {
        initHandlers();
        initAutoComplete();
    };

    const initHandlers = function () {
        $(_ref.apply).on("click", () => {
            apply();
        });

        $(_ref.cancel).on("click", () => {
            cancel();
        });

        $(_ref.skillSearchBox).on("blur", function (e) {
            const val = $(this).val();
            if (val === "" || val === null) {
                e.preventDefault();
                hideApplyBtn();
            }
        });
    };

    const initAutoComplete = function () {
        const _config = {
            elem: $(_ref.skillSearchBox),
            dispProp: "name",
            valProp: "id",
            action: createSkill,
            onSelect: onSelect
        };
        ac = new TSSuggest(_config);
        ac.init();
    };

    const readAcValAgain = function () {
        $(_ref.skillSearchBox).trigger("keyup");
    }

    const updateAc = function (data) {
        if (ac && data) {
            ac.data = data;
        }
    }

    const cancel = function (scrollToEnd) {
        $(_ref.skillSearchBox).val("");
        selectedItems.length = 0;
        hideApplyBtn();
        hideTagBox();
        ttl.refreshUi();
        skills.makePills(scrollToEnd);
    };

    const apply = function () {
        const inputBox = $(_ref.skillSearchBox);
        let allItems = ttl.getAllItems();
        allItems.forEach((ai) => {
            if (selectedItems.indexOf(ai.uid) > -1) {
                ai.skill.name = inputBox.val();
                ai.skill.id = inputBox.data("itemId");
            }
        });
        cancel(true);
    };

    const updateSelectedInTagBox = function (jqElem) {
        const uid = jqElem.closest("li").data("uid");
        const elemChecked = jqElem.is(":checked");
        const itemRow = jqElem.closest(".itemRow");
        if (elemChecked) {
            if (selectedItems.indexOf(uid) === -1) {
                selectedItems.push(uid);
            }
        } else {
            const idx = selectedItems.indexOf(uid);
            if (idx > -1) {
                selectedItems.splice(idx, 1);
            }
        }

        if (selectedItems && selectedItems.length > 0) {
            const len = selectedItems.length;
            updateCount(len);
            if (len === 1) {
                showTaggedSkill(_isTagged(selectedItems[0]));
            } else {
                hideTaggedSkill();
            }
        } else {
            hideTagBox();
            // console.warn("No selected items", selectedItems);
        }
    };

    const _isTagged = function (parentId) {
        const parent = $("li[data-uid=" + parentId + "]");
        const skill = parent.find(".checkbox > input").data("skillName");
        return skill ? skill : false;
    };

    const prepareTagBox = function (jqElem) {
        if (jqElem.is(":checked")) {
            fetchSkills();
            updateSelectedInTagBox(jqElem);
            showTagBox();
        }
    };

    const fetchSkills = function () {
        skills.fetch($(_ref.tagBox));
    };

    const updateCount = function (num) {
        if (!num || isNaN(num)) {
            return;
        }
        const x = num === 1 ? "1 item" : num + " items";
        $(_ref.tagItemCountBox).html(x);
    };

    const showTaggedSkill = function (skill) {
        if (skill) {
            const x = `Current item is tagged with: <br><strong>${skill}</strong>`;
            $(_ref.tagMsg).html(x).removeClass("hidden");
        }
    };

    const hideTaggedSkill = function () {
        $(_ref.tagMsg).html("").addClass("hidden");
    };

    const createSkill = function () {
        skills.create();
        showApplyBtn();
    };

    const onSelect = function () {
        // Function that should occur when a selection in auto complete is made
        showApplyBtn();
    };

    const showApplyBtn = function () {
        $(_ref.apply).removeClass("hidden");
    };

    const hideApplyBtn = function () {
        $(_ref.apply).addClass("hidden");
    };

    const showTagBox = function () {
        $(_ref.tagBox).removeClass("invisible");
        ttl.disable();
        // Initiate auto complete if required
    };

    const hideTagBox = function () {
        $(_ref.tagBox).addClass("invisible");
        ttl.enable();
    };

    const isTagBoxVisible = function () {
        return !$(_ref.tagBox).hasClass("invisible");
    };

    tb.init = init;
    tb.isVisible = isTagBoxVisible;
    tb.updateSelected = updateSelectedInTagBox;
    tb.prepare = prepareTagBox;
    tb.updateAutoComplete = updateAc;
    tb.refreshAc = readAcValAgain;

})(ProjectNameSpace.TagBox,
    ProjectNameSpace.Skills,
    ProjectNameSpace.TSTextToList);

//#endregion

//#region Horizontal Scroll Plugin
(function (hs, u) {
    "use strict";

    let _hsVars = {
        hsClass: "ts-horizontal-scroll",
        arrowKeys: "hSArrowKeys",
        leftArrowKey: "hsLeftArrowKey",
        rightArrowKey: "hsRightArrowKey",
        arrowKeyDisabled: "hSArrowDisabled",
        arrowKeyHidden: "hSArrowHidden",
        leftKeyClass: "fa fa-angle-left",
        rightKeyClass: "fa fa-angle-right",
        scrollArea: "hsScrollArea",
        scrollAreaClass: null,
        parent: null
    };

    const init = function (config) {
        _validateConfig(config);
        _assignPrivVars(config);
        _prepareDomElems(config.parent);
        _initHandlers();
        _toggleArrowKeyVisibility();
    };

    const exampleConfig = function () {
        return {
            parent: $("#skillTagsWithIcon"),
            keys: {
                left: {
                    id: "leftArrowKey",
                    class: "fa fa-angle-left"
                },
                right: {
                    id: "rightArrowKey",
                    class: "fa fa-angle-right"
                }
            },
            scrollAreaClass: "skillTags"
        };
    }

    const _validateConfig = function (config) {
        if (!config || config === null || typeof config !== "object") {
            console.error("No Configuration Object provided for Horizontal Scroll Initialization. Only PARENT property is mandatory, rest are optional. Configuration should be like this: ", exampleConfig());
            return false;
        } else {
            if (!config.parent || config.parent.length <= 0 || !(config.parent instanceof jQuery)) {
                console.error("Parent element missing in configuration, it should be a jQuery object. Whole configuration should be like this: ", exampleConfig());
                return false;
            }
        }
    }

    const _assignPrivVars = function (c) {
        const keys = c.keys;
        if (keys) {
            _hsVars.leftArrowKey = keys.left ? (keys.left.id ? keys.left.id : _hsVars.leftArrowKey) : _hsVars.leftArrowKey;
            _hsVars.leftKeyClass = keys.left ? (keys.left.class ? keys.left.class : _hsVars.leftArrowKey) : _hsVars.leftKeyClass;

            _hsVars.rightArrowKey = keys.right ? (keys.right.id ? keys.right.id : _hsVars.rightArrowKey) : _hsVars.rightArrowKey;
            _hsVars.rightKeyClass = keys.right ? (keys.right.class ? keys.right.class : _hsVars.rightArrowKey) : _hsVars.rightKeyClass;
        }
        _hsVars.scrollAreaClass = c.scrollAreaClass ? c.scrollAreaClass : _hsVars.scrollAreaClass;
        _hsVars.parent = c.parent;
    };

    const _prepareDomElems = function (parent) {
        parent.addClass(_hsVars.hsClass);
        const keyClasses = _hsVars.arrowKeys + " " + _hsVars.arrowKeyHidden;
        const lKeyClasses = _hsVars.leftKeyClass + " " + _hsVars.arrowKeyDisabled + " " + keyClasses;
        const rKeyClasses = _hsVars.rightKeyClass + " " + keyClasses;
        const scrollArea = _hsVars.scrollArea + _hsVars.scrollAreaClass ? _hsVars.scrollAreaClass : "";

        const hsHtml = "" +
            `<i id="${_hsVars.leftArrowKey}" class="${lKeyClasses}"></i>
            <div id="${_hsVars.scrollArea}" class="${scrollArea}"></div>
            <i id="${_hsVars.rightArrowKey}" class="${rKeyClasses}"></i>`;

        parent.append(hsHtml);
    };

    const _initHandlers = function () {
        _hsVars.parent.on("scroll", "#" + _hsVars.scrollArea, () => {
            _handleArrowKeyState();
        }).on("click", "#" + _hsVars.leftArrowKey, (e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollSkill(true);
        }).on("click", "#" + _hsVars.rightArrowKey, (e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollSkill();
        });

        $(window).on("resize", () => {
            _toggleArrowKeyVisibility();
        });
    };

    const _toggleArrowKeyVisibility = function () {
        const isSkillBoxOverflowing = u.isElemOverflowing($("#" + _hsVars.scrollArea)[0]);
        if (isSkillBoxOverflowing) {
            toggleScrollArrowKeys(true);
        } else {
            toggleScrollArrowKeys();
        }
    };

    const toggleScrollArrowKeys = function (showIcons) {
        showIcons ? $("." + _hsVars.arrowKeys).removeClass(_hsVars.arrowKeyHidden) : $("." + _hsVars.arrowKeys).addClass(_hsVars.arrowKeyHidden);
    };

    const toggleArrowKeysState = function (elem, disable) {
        disable ? elem.addClass(_hsVars.arrowKeyDisabled) : elem.removeClass(_hsVars.arrowKeyDisabled);
    };

    const _handleArrowKeyState = function () {
        const jqElem = $("#" + _hsVars.scrollArea);
        if (jqElem && jqElem.length > 0) {
            const scrollLeft = jqElem.scrollLeft();
            const elemWidth = jqElem.outerWidth();

            const remaingingScroll = jqElem.get(0).scrollWidth - scrollLeft;

            if (remaingingScroll === elemWidth) {
                toggleArrowKeysState($("#" + _hsVars.rightArrowKey), true);
            }

            if (remaingingScroll > elemWidth) {
                toggleArrowKeysState($("#" + _hsVars.rightArrowKey), false);
            }

            if (scrollLeft === 0) {
                toggleArrowKeysState($("#" + _hsVars.leftArrowKey), true);
            }

            if (scrollLeft > 0) {
                toggleArrowKeysState($("#" + _hsVars.leftArrowKey), false);
            }
        }
    };

    const scrollSkill = function (isLeft) {
        const scrollVal = 250;
        const leftValue = isLeft ? -scrollVal : scrollVal
        const sa = $("#" + _hsVars.scrollArea);
        const leftPos = sa.scrollLeft();
        sa.animate({
            scrollLeft: leftPos + leftValue
        }, 300);

        sa.promise().done(() => _handleArrowKeyState());
    };

    const _scrollToEnd = function () {
        const sa = $("#" + _hsVars.scrollArea);
        const w = sa.width();
        sa.animate({
            scrollLeft: w
        }, 300);

        sa.promise().done(() => _handleArrowKeyState());
    };

    const makeContent = function (elemHtml, scrollToEnd) {
        scrollToEnd = !!scrollToEnd;
        const sa = $("#" + _hsVars.scrollArea);
        sa.html(elemHtml);
        _toggleArrowKeyVisibility();
        if (scrollToEnd) {
            _scrollToEnd();
        }
    };

    hs.init = init;
    hs.exampleConfig = exampleConfig;
    hs.makeContent = makeContent;

})(ProjectNameSpace.TSHorizontalScroll, ProjectNameSpace.Utils);

//#endregion

//#region SkillTagging

(function (st, u, ttl, tb, skills) {
    "use strict";

    // DOM Element references (Do Not Pollute with useless DOM Elements)
    let Elems = {
        listInput: "#listItemsInput",
        listArea: "#listItems",
        addBtn: "#addBtn",
        clearTxt: ".clearText",
        tagBox: ".tagItemsToSkill",
        tagItemCountBox: "#tagItems",
        tagMsg: "#tagMsg",
        itemRow: ".itemRow"
    };

    // Initial method
    const init = function () {
        _initHandlers();
        ttl.init({
            listElem: Elems.listArea,
            bulletClick: onBulletClick
        });
        tb.init();
        skills.init();
        // This will make tagged skills pills if items are pre-loaded
        // Won't work as of now as we are not fetching something on page load (such as existing list items)
        skills.makePills();
    };

    // Registering event handlers
    const _initHandlers = function () {
        $(Elems.addBtn).on("click", (e) => {
            e.preventDefault();
            convertTextToList();
        });

        $(Elems.listInput).on("keydown", (e) => {
            if (u.isEnterKey(e)) {
                e.preventDefault(e);
                convertTextToList();
            } // else do nothing
        });

        $(Elems.clearTxt).on("click", (e) => {
            e.preventDefault();
            clearInput(true);
        });
    };

    // Convert input text into array of list items if multiple lines are available
    const convertTextToList = function () {
        let inputText = $(Elems.listInput).val();
        clearInput();
        if (inputText && inputText.length > 0) {
            ttl.makeList(inputText);
        }
    };

    const clearInput = function (doFocus) {
        // cleatr input box and fix UI
        $(Elems.listInput).val("");
        if (doFocus) {
            $(Elems.listInput).focus();
        }
    };

    const getSkillPill = function (skillName) {
        return `<div class="skillBox"><span>${skillName}</span><i class="fa fa-close"></i></div>`;
    };

    const onBulletClick = function (e) {
        const elem = u.getJqElem(e);
        if (tb.isVisible()) {
            tb.updateSelected(elem);
        } else {
            tb.prepare(elem);
        }
    };

    // Public functions 
    st.init = init;
    st.getSkillPill = getSkillPill;
})(ProjectNameSpace.SkillTagging,
    ProjectNameSpace.Utils,
    ProjectNameSpace.TSTextToList,
    ProjectNameSpace.TagBox,
    ProjectNameSpace.Skills);

//#endregion

//#region Document Ready

$(() => {
    // Initialize UserForm on Document Ready
    ProjectNameSpace.SkillTagging.init();
});

//#endregion

// add onSelect in autoComplete
// fix closeAllList, should not fire when clicked in auto complete elemnt(s), show name and store id in data-* of search input
// also show save and cancel btn after above step and write their resp funcs
// add validation for tagging skill
// make get set methods for allItems in TSTextToList