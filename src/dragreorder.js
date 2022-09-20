/**
 * Make table sortable by drag and drop
 *
 * 
 * Add attribute dragtosort=true to the table and additional attributes:
 *  - 'data-dragtosort-table'     Should reference the controller table acronym or index
 *  - 'data-dragtosort-rowskip'   Number of top rows to exclude from dragging
 *  - 'data-dragtosort-action'    Way of returning new sort order. Possible values are: 'button', 'instant'
 * Each row should have 'data-id' with the database row ir reference
 *
 * If handling additional buttons, add attributes to the buttons:
 *  - data-dragbtn    Action of the button. Possible values are: 'save', 'cancel, 'conditional'
 *  - data-dbref      Should be the same as on the table
 *
 * @author Gregor Rekowski
 *
 * 
 */
 class DragReorder {

    
    
    #initialOrder;
    #currentlyDraggedClassName = "dragreorder-dragging";
    #container;
    #reference;
    #excludeTopRows;
    #action;
    #save_btn;
    #cancel_btn;
    #other_btns;
    #currentlyDraggedElement;
    #settings = {
        'hide_conditional': true, 
        'hide_savecancel': true,
    };
    #callback;
    static dragStart = null;

    /**
     * Sets all data to work on
     * @param   {Object}                        htmltable                           Reference the javascript controller.
     * @param   {Object}                        [settings]                          Customize behaviour.
     * @param   {boolean}                       [settings.hide_conditional=true]    Hide conditional buttons when order has changed and changes not saved;
     * @param   {boolean}                       [settings.hide_savecancel=true]     Hide Save and Cancel buttons when no changes to order done;
     * @param   {Requester~requestCallback}     [callback=null]                     The callback that Will be triggered when save button clicked or at the dragend if instant action selected
     */
    constructor(htmltable, settings=null, callback=null) {
        
        // validate
        if (typeof htmltable !== "object") {
            console.error("Provided parameter must be an Object");
            return false;
        }
        
        this.#container = htmltable;
        this.#reference = htmltable.getAttribute("dragreorder-ref");
        this.#excludeTopRows = htmltable.getAttribute("dragreorder-rowskip") || 0;
        this.#action = htmltable.getAttribute("dragreorder-action");
        // Buttons (save, cancel, conditional)
        this.#save_btn =   document.querySelector("[dragreorder-ref=" + this.#reference + "][dragreorder-action=save]");
        this.#cancel_btn = document.querySelector("[dragreorder-ref=" + this.#reference + "][dragreorder-action=cancel]");
        this.#other_btns = document.querySelectorAll("[dragreorder-ref=" + this.#reference + "][dragreorder-action=conditional]");
        this.#updateSettings(settings);
        this.#callback = callback;
        this.#makeRowsDraggable();
    }

    /**
     * Change class name for custom
     * @param   {string}                        name                                Custom class name for dragged element
     */
    
    set className(name) {
        if(name.trim().length < 1) {
            console.error("Provided parameter cannot be empty");
            return false;
        }
        this.#currentlyDraggedClassName = name.trim();
    }


    /**
     * Gets all rows that should be draggable
     * @return  {array.Object}
     */
    #getDraggableRows() {

        let rows = [];
        const container = this.#container;
        const excludeTopRows = this.#excludeTopRows;

        container.querySelectorAll("tr").forEach(function (row, index) {

            // Skip top rows
            if (index < excludeTopRows) return;

            rows.push(row);

        });

        return rows;

    }



    /**
     * Get id's in current order
     * @param   {boolean}                       [DEBUG=false]    If set to true will output debugging messages.
     * @return  {array.string}
     */
    getOrder(DEBUG = false) {

        // Initialise variables
        const order = [];
        const draggableRows = this.#getDraggableRows();

        //Loop through rows and build array
        for (let i = 0, row; row = draggableRows[i]; i++) {
            if (row.hasAttribute("dragreorder-id")) order[i] = row.getAttribute("dragreorder-id");
        }
        if (DEBUG) console.log("Row order", order);
        return order;

    }

    /**
     * Action to trigger at the end of drag. Custom functionalities inside this method.
     * @param     {boolean}                     [DEBUG=false]    If set to true will output debugging messages.
     */
    #dragEndAction(DEBUG = false) {

        if (DEBUG) console.log("Action triggered on", this.#action);
        
        const isEqual = this.#isEqual(this.#initialOrder, this.getOrder());
        if (DEBUG) console.log("isEqual", isEqual);


        // Update buttons
        this.#updateButtons();

        

        // Callback action
        if (this.#action === "instant") {

            if (DEBUG) console.log("Instant or Both Action -> run callback action");
            
            this.#callbackAction();

        }
    }

    #updateSettings(settings){

        if (typeof settings !== "object") {
            console.error("Settings parameter must be an Object");
            return false;
        }

        for (const property in settings) {
            //console.log(`${property}: ${object[property]}`);
            this.#settings[property] = settings[property];
        }

    }
    
    #updateButtons(DEBUG = false){


        const isEqual = this.#isEqual(this.#initialOrder, this.getOrder());
        if (DEBUG) console.log("isEqual", isEqual);

        if(this.#other_btns.length > 0) {
            
            // No changes -> display conditional buttons
            if (this.#settings.hide_conditional && isEqual) {
                if (DEBUG) console.log("Show conditional buttons");
                this.#other_btns.forEach(element => {
                    element.style.removeProperty("display");
                });
            }

            // Different order -> hide conditional buttons
            if (this.#settings.hide_conditional && !isEqual) {
                if (DEBUG) console.log("Hide conditional buttons");
                this.#other_btns.forEach(element => {
                    element.style.display = "none";
                });
            }

        }

        if (this.#cancel_btn != null) {
            // No changes -> hide cancel button
            if (this.#settings.hide_savecancel && isEqual) {
                if (DEBUG) console.log("Hide cancel buttons");
                this.#cancel_btn.style.display = "none";    
            }

            // Different order -> display cancel button
            if (this.#settings.hide_savecancel && !isEqual) {
                if (DEBUG) console.log("Show cancel buttons");
                this.#cancel_btn.style.removeProperty("display");
            }
        }
         
        if (this.#save_btn != null) {
            // No changes -> hide save button
            if (this.#settings.hide_savecancel && isEqual) {
                this.#save_btn.style.display = "none";    
            }

            // Different order -> display save button
            if (this.#settings.hide_savecancel && !isEqual) {
                this.#save_btn.style.removeProperty("display");
            }
        }       
        
    }


    /**
     * Callback action defined
     * @param     {boolean}         [DEBUG=false]   If set to true will output debugging messages.
     * @returns   {Object}          obj             Object to upload
     * @returns   {string}          obj.tableref    The table reference
     * @returns   {array.string}    obj.order       Ordered array of id's
     */
    #callbackAction(DEBUG = false) {

        if(DEBUG) console.log("Callback method started");
        if(DEBUG) console.log("Callback", this.#callback);


        if (typeof(this.#callback) == 'function') {
            this.#callback(this.getOrder());
        }


        // Get the current order as initial
        this.#initialOrder = this.getOrder();


        // Update buttons
        this.#updateButtons();

    }




    



    



    /**
     * Check if two variables are equal.
     * @param     {array}       a                First array to compare.
     * @param     {array}       b                Second array to compare.
     * @return    {boolean}
     */
    #isEqual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);



    /**
     * @param     {Object}          row             The table row object.
     * @param     {boolean}         [DEBUG=false]   If set to true will output debugging messages.
     */
    #dragStartListener(row, DEBUG = false) {

        row.addEventListener('dragstart', e => {

            // Add class to the currently dragged element
            row.classList.add(this.#currentlyDraggedClassName);

            // Save currently dragged element
            this.#currentlyDraggedElement = e.target;

            // Save initial container as global variable for later comparison
            DragReorder.dragStart = e.target.offsetParent;
            

            if (DEBUG) console.log("Drag start", e);
            if (DEBUG) console.log("Drag container", DragReorder.dragStart);
            if (DEBUG) console.log("Drag element", this.#currentlyDraggedElement);

        });

    }



    /**
     * @param     {Object}          row             The table row object.
     * @param     {boolean}         [DEBUG=false]   If set to true will output debugging messages.
     */
    #dragEndListener(row, DEBUG = false) {

        row.addEventListener('dragend', () => {

            // Remove class from the currently dragged element
            row.classList.remove(this.#currentlyDraggedClassName);

            // Remove currently dragged element
            this.#currentlyDraggedElement = null;

            if (DEBUG) console.log("Drag end");
            if (DEBUG) console.log("Drag element", this.#currentlyDraggedElement);

            this.#dragEndAction();

        });

    }



    /**
     * @param     {Object}          row             The table row object.
     * @param     {boolean}         [DEBUG=false]   If set to true will output debugging messages.
     */
    #dragOverListener(row, DEBUG = false) {

        row.addEventListener("dragover", e => {

            e.preventDefault();

            // Check if dragged element is within self container
            if (e.target.offsetParent != DragReorder.dragStart) return;

            // Get rows of the table
            let children = Array.from(e.target.closest('tbody').children);

            // get the tr of the table row
            let parentrow = e.target.closest('tr');

            // Reposition row before or after
            if (children.indexOf(parentrow) > children.indexOf(this.#currentlyDraggedElement)) {
                parentrow.after(this.#currentlyDraggedElement);
            } else {
                parentrow.before(this.#currentlyDraggedElement);
            }

            if (DEBUG) console.log("Drag over");

        });

    }



    /**
     * Register click event listener on 'Save' button
     * @param     {boolean}         [DEBUG=false]   If set to true will output debugging messages.
     */
    #saveButtonListener(DEBUG = false) {

        if (this.#save_btn === null) return;


        this.#save_btn.addEventListener('click', () => {
            if (DEBUG) console.log("'click' event on 'Save' button");
            this.#callbackAction();
        });
        
    }



    /**
     * Reverting table order to the original
     * @param DEBUG
     */
    revertOrdering(DEBUG = false) {

        if (DEBUG) console.log("Start checking rows order");

        const draggableRows = this.#getDraggableRows();

        // Initialise the count variable
        let count = 0;

        let thisrow;

        for (let i = 0, row; row = draggableRows[i]; i++) {

            if (row.hasAttribute("dragreorder-id")) {
                thisrow = row.getAttribute("dragreorder-id");
            }

            if (i !== this.#initialOrder.indexOf(thisrow)) {

                if (DEBUG) console.log("Scanning row position " + i + " with id " + thisrow + " previously at position " + this.#initialOrder.indexOf(thisrow));

                if (i > draggableRows[i]) {
                    draggableRows[i].after(draggableRows[this.#initialOrder.indexOf(thisrow)]);
                    if (DEBUG) console.log("Row #" + i + " going after " + this.#initialOrder.indexOf(thisrow));
                } else {
                    draggableRows[i].before(draggableRows[this.#initialOrder.indexOf(thisrow)]);
                    if (DEBUG) console.log("Row #" + i + " going before " + this.#initialOrder.indexOf(thisrow));
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
            this.#dragEndAction();
        }

    }



    /**
     * Register click event listener on 'Cancel' button.
     * @param     {boolean}         [DEBUG=false]   If set to true will output debugging messages.
     */
    #cancelButtonListener(DEBUG = false) {

        if (this.#cancel_btn == null) return;

        this.#cancel_btn.addEventListener('click', () => {
            if (DEBUG) console.log("'click' event on 'Cancel' button");
            this.revertOrdering();
        });


        // Update buttons
        this.#updateButtons();

    }



    /**
     * Insert styles for the table
     */
    #insertStyles() {

        if (document.querySelector("style#dragtosort_css") !== null) return;

        const style = document.createElement('style');
        style.id = "dragtosort_css";
        style.innerHTML = `
                /* Cursor change and icon on the left hand side */
                table[dragreorder=true] tr[draggable=true] {
                    cursor: grab;
                    background-position: 0.2em center;
                    background-repeat: no-repeat;
                    background-size: 1.2em 1.2em;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' %3E%3Cpath d='M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z'%3E%3C/path%3E%3C/svg%3E");
                }
                /* add extra padding-left to move text away from icon */
                table[dragreorder=true] > tbody > tr > td:first-child {
                    padding-left: 1.5em;
                }
                /* before drag ends, visual difference from other rows */
                table[dragtosort=true] tr.` + this.#currentlyDraggedClassName + ` {
                    opacity: 0.2;
                }
            `;

        document.head.appendChild(style);

    }



    /**
     * Add attributes and event listeners
     */
    #makeRowsDraggable() {

        const draggableRows = this.#getDraggableRows();

        draggableRows.forEach(function (row, index) {


            // Add 'draggable' attribute
            row.setAttribute("draggable", "true");


            // Listen to dragstart
            this.#dragStartListener(row);


            // Listen to dragend
            this.#dragEndListener(row);


            // Listen to dragover
            this.#dragOverListener(row);


        }, this);

        // Insert styles to the page
        this.#insertStyles();

        // Get the initial order of the table
        this.#initialOrder = this.getOrder();

        // Listen to Save button
        this.#saveButtonListener();

        // Listen to Cancel button
        this.#cancelButtonListener();

    }

}