class TSSuggest {
  constructor(params) {
    this.elem = params.elem;
    this.dispProp = params.dispProp;
    this.valProp = params.valProp;
    this.data = params.data;
    this.action = params.action ? params.action : function () { };
    this.onSelect = params.onSelect ? params.onSelect : function () { };
    this.id = params.elem[0].id ? params.elem[0].id : "acl";
    this._cf;
    this.init();
  }

  init() {
    const elm = this.elem;
    elm.on("keyup", (ev) => {
      this._initAutoComplete(this, ev);
    });

    const acParent = elm.parent();

    acParent.on("click", ".autocomplete-list-item", function () {
      const inputElem = $(this).find("input");
      const selectedItem = inputElem.val();
      if (selectedItem) {
        elm.val(selectedItem);
        elm.data("itemId", inputElem.data("itemId"));
        this.onSelect();
      }
    }).on("click", "." + this.acClass.createSkill, (e) => {
      this.action(e);
    });

    $(document).on("click", (e) => {
        this._closeAllLists(e.target);
    });

  }

  _initAutoComplete(self, ev) {
    let acTxt = self.value;
    this._closeAllLists();
    if (!acTxt) { return false; }
    this._cf = -1;

    let aclem = "<div id=\"" + this.id + "-ac-list" + "\" class=\"" + this.acClass.parent + "\">";
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
      aclem = aclem + "<div class=\"ac-not-found " + this.acClass.child + "\">" +
        "<strong>Not Found!</strong><br> " +
        "<button id=\"createSkill\" data-tag-name=\"" + acTxt + "\" class=\"btn btn-success btn-xs " +
        this.acClass.createSkill + "\">Create <strong>" + acTxt + "</strong>?</button>"
    }

    aclem = aclem + "</div>";
    this.elem.after(aclem);

    this._manageAcVal(ev);
  }

  _closeAllLists() {
    $("#" + this.id + "-ac-list").remove();
  }

  _manageAcVal(e) {
    let x = $(this.id + "autocomplete-list");
    if (x && x.length > 0) {
      x = x.children("div");
    }
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
        if (x) x[this._cf].trigger("click");
      }
    }
  }

  _addActive(x) {
    if (!x) return false;
    /*start by removing the "active" class on all items:*/
    this._removeActive(x);
    this._cf = this._cf >= x.length ? 0 : x.length - 1;
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
