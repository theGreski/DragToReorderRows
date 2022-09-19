/**
 * Make table sortable by drag and drop
 *
 * Add attribute dragtosort=true to the table and additional attributes:
 *  - 'data-dragtosort-table'     Should reference the controller table acronym or index
 *  - 'data-dragtosort-rowskip'   Number of top rows to exclude from dragging
 *  - 'data-dragtosort-action'    Way of returning new sort order. Possible values are: 'button', 'instant', 'both'
 * Each row should have 'data-id' with the database row ir reference
 *
 * If handling additional buttons, add attributes to the buttons:
 *  - data-dragbtn    Action of the button. Possible values are: 'save', 'cancel, 'conditional'
 *  - data-dbref      Should be the same as on the table
 *
 *
 * @param {Object}     table         Should reference the java controller;
 */
class DragReorder {

    
    
    #initialOrder;
    

    static dragStart = null;

    /**
     * Sets all data to work on
     * @param {Object}     htmltable            Reference the javascript controller.
     */
    constructor(htmltable) {
        
        // validate
        if (typeof htmltable !== "object") {
            console.error("Provided parameter must be an Object");
            return false;
        }

        this.#currentlyDraggedClassName = "dragreorder-dragging";
        this.#container = htmltable;
        this.#reference = htmltable.getAttribute("dragreorder-ref");
        this.#excludeTopRows = htmltable.getAttribute("dragreorder-rowskip") || 0;
        this.#action = htmltable.getAttribute("dragreorder-action");
        // Buttons (save, cancel, conditional)
        this.#save_btn = document.querySelector("[dragreorder-ref=" + this.#reference + "][dragreorder-action=save]");
        this.#cancel_btn = document.querySelector("[dragreorder-table=" + this.#reference + "][dragreorder-action=cancel]");
        this.#other_btns = document.querySelectorAll("[dragreorder-ref=" + this.#reference + "][dragreorder-action=conditional]");
        this.makeRowsDraggable();
    }

    // Change class name for custom
    set className(name) {
        if(name.trim().length < 1) {
            console.error("Provided parameter cannot be empty");
            return false;
        }
        this.#currentlyDraggedClassName = name.trim();
    }


    /**
     * Gets all rows that should be draggable
     * @param     {boolean}        [DEBUG=false]    If set to true will output debugging messages.
     * @return    {array}
     */
    get #draggableRows(DEBUG = false) {

        if (DEBUG) console.log("Getting draggable rows");

        const $this = this;

        let rows = [];
        //const container = this.container;
        //const excludeTopRows = this.#excludeTopRows;

        this.#container.querySelectorAll("tr").forEach(function (row, index) {

            // Skip top rows
            if (index < this.#excludeTopRows) return;

            rows.push(row);

        });

        if (DEBUG) console.log("Draggable rows", rows);

        return rows;

    }



    /**
     * Get id's in current order
     * @param     {boolean}        [DEBUG=false]    If set to true will output debugging messages.
     * @return    {array}
     */
    get #order(DEBUG = false) {

        // Initialise variables
        const order = [];
        const draggableRows = this.getDraggableRows();

        //Loop through rows and build array
        for (let i = 0, row; row = draggableRows[i]; i++) {
            if (row.hasAttribute("dragreorder-id")) order[i] = row.getAttribute("dragreorder-id");
        }
        if (DEBUG) console.log("Row order", order);
        return order;

    }

    /**
     * Action to trigger at the end of drag. Custom functionalities inside this method.
     * @param     {boolean}        [DEBUG=false]    If set to true will output debugging messages.
     */
    dragEndAction(DEBUG = false) {

        if (DEBUG) console.log("Action triggered on", this.#action);

        const isEqual = this.isEqual(this.initialOrder, this.getOrder());
        if (DEBUG) console.log("isEqual", isEqual);

        // work on buttons
        if (this.#action === "button" || this.#action === "both") {

            if (DEBUG) console.log("Save button", this.save_btn);
            if (DEBUG) console.log("Cancel button", this.cancel_btn);
            if (DEBUG) console.log("Other buttons", this.other_btns);

            // Enable/Disable save and cancel reorder
            if (isEqual == false) {
                if (DEBUG) console.log("Enable save and cancel reorder");
                // Enable Save and Cancel buttons
                if (this.save_btn != null) this.save_btn.style.removeProperty("display");
                if (this.cancel_btn != null) this.cancel_btn.style.removeProperty("display");
                // Disable other buttons if found
                if (this.other_btns.length > 0) {
                    this.other_btns.forEach(element => {
                        element.style.display = "none";
                    });
                }
            } else {
                // Disable Save and Cancel buttons
                if (DEBUG) console.log("Disable save and cancel reorder");
                if (this.save_btn != null) this.save_btn.style.display = "none";
                if (this.cancel_btn != null) this.cancel_btn.style.display = "none";
                // Enable other buttons if found
                if (this.other_btns.length > 0) {
                    this.other_btns.forEach(element => {
                        element.style.removeProperty("display");
                    });
                }
            }

        }

        // Output data
        if (this.#action === "instant" || this.#action === "both") {

            if (DEBUG) console.log("Instant or Both Action -> return object to upload");
            this.uploadData();

        }
    }



    /**
     * Upload the data to backend controller
     * @param     {boolean}         [DEBUG=false]   If set to true will output debugging messages.
     * @returns   {Object}          obj             Object to upload
     * @returns   {string}          obj.tableref    The table reference
     * @returns   {array.string}    obj.order       Ordered array of id's
     */
    uploadData(DEBUG = false) {

        if (DEBUG) console.log("Data upload start");

        const $this = this;


        TEMETRA.AJAX.send({ dragreorder: 1, table: this.table, order: this.getOrder().toString() }, function (data) {

            if (DEBUG) console.log("Response", data);
            if (DEBUG) console.log("Response type of", typeof data);

            if (typeof data === 'object' && data.hasOwnProperty('success') && data.hasOwnProperty('message')) {

                if (data.success == true || data.success == 'true') {

                    if (DEBUG) console.log(data.message);

                    // Get the current order as initial
                    $this.initialOrder = $this.getOrder();

                    // to fix the buttons
                    $this.dragEndAction();

                    // display green box
                    // TEMETRA.UI.displayAlertBox(data.message, "success", false, 2500, "", document.getElementById("netadmin-s2r"), true);

                } else {

                    if (DEBUG) console.error(data.message);

                    // display red box
                    TEMETRA.UI.displayAlertBox(data.message, "warning", false, 2500, "", document.getElementById("netadmin-s2r"), true);

                }

            } else {
                TEMETRA.UI.displayAlertBox(data.message, "danger", false, 2500, "", document.getElementById("netadmin-s2r"), true);
            }


        });

    }



    



    



    /**
     * Check if two variables are equal.
     * @param     {array}       a                First array to compare.
     * @param     {array}       b                Second array to compare.
     * @return    {boolean}
     */
    isEqual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);



    /**
     * @param     {Object}          row             The table row object.
     * @param     {boolean}         [DEBUG=false]   If set to true will output debugging messages.
     */
    dragStartListener(row, DEBUG = false) {

        row.addEventListener('dragstart', e => {

            // Add class to the currently dragged element
            row.classList.add(this.#currentlyDraggedClassName);

            // Save currently dragged element
            this.currentlyDraggedElement = e.target;

            // Save initial container as global variable for later comparison
            //DragSort.dragStart = e.srcElement.offsetParent.dataset.dbref;
            DragSort.dragStart = e.target.offsetParent.dataset.dbref;

            if (DEBUG) console.log("Drag start", e);
            if (DEBUG) console.log("Drag container", DragSort.dragStart);
            if (DEBUG) console.log("Drag element", this.currentlyDraggedElement);

        });

    }



    /**
     * @param     {Object}          row             The table row object.
     * @param     {boolean}         [DEBUG=false]   If set to true will output debugging messages.
     */
    dragEndListener(row, DEBUG = false) {

        row.addEventListener('dragend', () => {

            // Remove class from the currently dragged element
            row.classList.remove(this.currentlyDraggedClassName);

            // Remove currently dragged element
            this.currentlyDraggedElement = null;

            if (DEBUG) console.log("Drag end");
            if (DEBUG) console.log("Drag element", this.currentlyDraggedElement);

            this.dragEndAction();

        });

    }



    /**
     * @param     {Object}          row             The table row object.
     * @param     {boolean}         [DEBUG=false]   If set to true will output debugging messages.
     */
    dragOverListener(row, DEBUG = false) {

        row.addEventListener("dragover", e => {

            e.preventDefault();

            // Check if dragged element is within self container
            if (e.target.offsetParent.dataset.dbref != DragSort.dragStart) return;

            // Get rows of the table
            let children = Array.from(e.target.closest('tbody').children);

            // get the tr of the table row
            let parentrow = e.target.closest('tr');

            // Reposition row before or after
            if (children.indexOf(parentrow) > children.indexOf(this.currentlyDraggedElement)) {
                parentrow.after(this.currentlyDraggedElement);
            } else {
                parentrow.before(this.currentlyDraggedElement);
            }

            if (DEBUG) console.log("Drag over");

        });

    }



    /**
     * Register click event listener on 'Save' button
     * @param     {boolean}         [DEBUG=false]   If set to true will output debugging messages.
     */
    saveButtonListener(DEBUG = false) {

        if (this.save_btn === null) return;

        this.save_btn.addEventListener('click', () => {
            if (DEBUG) console.log("'click' event on 'Save' button");
            this.uploadData();
        });

    }



    /**
     * Reverting table order to the original
     * @param DEBUG
     */
    revertOrdering(DEBUG = false) {

        if (DEBUG) console.log("Start checking rows order");

        const draggableRows = this.getDraggableRows();

        // Initialise the count variable
        let count = 0;

        let thisrow;

        for (let i = 0, row; row = draggableRows[i]; i++) {

            if (row.hasAttribute("data-id")) {
                thisrow = row.getAttribute("data-id");
            }

            if (i !== this.initialOrder.indexOf(thisrow)) {

                if (DEBUG) console.log("Scanning row position " + i + " with id " + thisrow + " previously at position " + this.initialOrder.indexOf(thisrow));

                if (i > draggableRows[i]) {
                    draggableRows[i].after(draggableRows[this.initialOrder.indexOf(thisrow)]);
                    if (DEBUG) console.log("Row #" + i + " going after " + this.initialOrder.indexOf(thisrow));
                } else {
                    draggableRows[i].before(draggableRows[this.initialOrder.indexOf(thisrow)]);
                    if (DEBUG) console.log("Row #" + i + " going before " + this.initialOrder.indexOf(thisrow));
                }

                // Stop the loop as the order has changed
                break;

            }

            count++;

        }

        if (DEBUG) console.log("Reached row " + count + " out of " + draggableRows.length);
        if (count < draggableRows.length) {
            if (DEBUG) console.log("finished early");
            this.revertOrdering();
        } else {
            if (DEBUG) console.log("finished normal");
            this.dragEndAction();
        }

    }



    /**
     * Register click event listener on 'Cancel' button.
     * @param     {boolean}         [DEBUG=false]   If set to true will output debugging messages.
     */
    cancelButtonListener(DEBUG = false) {

        //const cancel_btn=document.querySelector("button[data-dragbtn=cancel][data-dbref="+this.table+"]");

        if (this.cancel_btn == null) return;

        this.cancel_btn.addEventListener('click', () => {
            if (DEBUG) console.log("'click' event on 'Cancel' button");
            this.revertOrdering();
        });



    }



    /**
     * Insert styles for the table
     */
    insertStyles() {

        if (document.querySelector("style#dragtosort_css") !== null) return;

        const style = document.createElement('style');
        style.id = "dragtosort_css";
        style.innerHTML = `
                table[dragtosort=true] tr[draggable=true] {
                    cursor: grab;
                    background-position: 0.2em center !important;
                    background-repeat: no-repeat !important;
                    background-size: 1.2em 1.2em !important;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' %3E%3Cpath d='M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z'%3E%3C/path%3E%3C/svg%3E") !important;
                }
                /* add extra padding-left to move text away from icon */
                table[dragtosort=true] > tbody > tr > td:first-child {
                    padding-left: 1.5em;
                }
                /* before drag ends, visual difference from other rows */
                table[dragtosort=true] tr.` + this.#currentlyDraggedClassName + ` {
                    opacity: 0.2;
                }
                /* overcoming/fixing styling from components.css */
                table[dragtosort=true].table-hover > tbody > tr:hover {
                  background-position: 0.2em center !important;
                  background-repeat: no-repeat !important;
                  background-size: 1.2em 1.2em !important;
                  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' %3E%3Cpath d='M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z'%3E%3C/path%3E%3C/svg%3E") !important;
                }
                table[dragtosort=true].table-hover > tbody > tr:hover > td {
                  background: unset !important;
                }
            `;

        document.head.appendChild(style);

    }



    /**
     * Add attributes and event listeners
     */
    makeRowsDraggable() {

        const draggableRows = this.getDraggableRows();

        draggableRows.forEach(function (row, index) {


            // Add 'draggable' attribute
            row.setAttribute("draggable", "true");


            // Listen to dragstart
            this.dragStartListener(row);


            // Listen to dragend
            this.dragEndListener(row);


            // Listen to dragover
            this.dragOverListener(row);


        }, this);

        // Insert styles to the page
        this.insertStyles();

        // Get the initial order of the table
        this.initialOrder = this.getOrder();

        // Listen to Save button
        this.saveButtonListener();

        // Listen to Cancel button
        this.cancelButtonListener();

    }

}