// @ts-nocheck
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/json/JSONModel',
    'sap/ui/core/Core',
    'sap/m/MessagePopover',
    'sap/ui/core/Element',
    'sap/m/MessageItem',
    'sap/ui/core/library',
    'sap/ui/core/message/Message'
],
	/**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     * @param {typeof sap.ui.model.json.JSONModel} JSONModel
     * @param {typeof sap.ui.core.Core} Core
     * @param {typeof sap.m.MessagePopover} MessagePopover
     * @param {typeof sap.ui.core.Element} Element
     * @param {typeof sap.m.MessageItem} MessageItem
     * @param {typeof sap.ui.core.library} library
     * @param {typeof sap.ui.core.message.Message} Message
     */
    function (Controller, JSONModel, Core, MessagePopover, Element, MessageItem, library, Message) {
        "use strict";

        var MessageType = library.MessageType;

        return Controller.extend("logaligroup.Front.controller.App", {
            onInit: function () { 

                const oModel = new JSONModel();
                oModel.loadData("./localService/mockdata/CustomerModel.json");
                
                this.oView = this.getView();
                
                this._MessageManager = Core.getMessageManager();

                //Clear the old messages
                this._MessageManager.removeAllMessages();

                this.oView.setModel(oModel);

                this._MessageManager.registerObject(this.oView.byId("formContainerPersonal"), true);
                this.oView.setModel(this._MessageManager.getMessageModel(), "message");

                this.createMessagePopover();
            },

            createMessagePopover: function () {

                let that = this;

                this.oMP = new MessagePopover({
                    activeTitlePress: function (oEvent) {
                        let oItem = oEvent.getParameter("item");
                        let oPage = that.getView().byId("employeePage");
                        let oMessage = oItem.getBindingContext("message").getObject();
                        let oControl = Element.registry.get(oMessage.getControlId());

                        if (oControl) {
                            oPage.scrollToElement(oControl.getDomRef(), 200, [0, -100]);
                            setTimeout(function () {
                                oControl.focus();
                            }, 300);
                        }
                    },
                    items: {
                        path: "message>/",
                        template: new MessageItem({
                            title: "{message>message}",
                            subtitle: "{message>additionalText}",
                            groupName: { parts: [{ path: 'message>controlIds' }], formatter: this.getGroupName },
                            activeTitle: { parts: [{ path: 'message>controlIds' }], formatter: this.isPositionable },
                            type: "{message>type}",
                            description: "{message>message}"
                        })
                    },
                    groupItems: true
                });

                this.getView().byId("messagePopover").addDependent(this.oMP);

            },

            // this group name is generated based on the current layout
            // specific for each use case
            getGroupName: function (sControlId) {
                let oControl = Element.registry.get(sControlId);

                if (oControl) {
                    let sFormSubtitle = oControl.getParent().getParent().getTitle().getText();
                   // let sFormTitle = oControl.getParent().getParent().getParent().getTitle();
                   // return sFormTitle + ", " + sFormSubtitle;
                   return sFormSubtitle;
                }
            },

            // this hook can be used by the application to determine if a
            // control can be found/reached on the page to navigate to 
            isPositionable: function (sControlId) {
                return sControlId ? true : false;
            },

            //Set the button icon according to the message with the highest severity
            //Error -> Warning -> Success -> Information
            mpIconFormatter: function () {

                let sIcon;
                let aMessage = this._MessageManager.getMessageModel().oData;

                aMessage.forEach(function (sMessage) {
                    switch (sMessage) {
                        case "Error":
                            sIcon = "sap-icon://message-error";
                            break;

                        case "Warning":
                            sIcon = sIcon !== "sap-icon://message-error" ? "sap-icon://message-warning" : sIcon;
                            break;

                        case "Success":
                            sIcon = sIcon !== "sap-icon://message-error" && sIcon !== "sap-icon://message-warning" ? "sap-icon://message-success" : sIcon;
                            break;

                        default:
                            sIcon = !sIcon ? "sap-icon://message-information" : sIcon;
                            break;
                    }
                });

                return sIcon;
            },

            //Display the button type according to the highest serverity
            //Negative -> Critical -> Success
            mpTypeFormatter: function () {

                let sHighSeverity;
                let aMessage = this._MessageManager.getMessageModel().oData;

                aMessage.forEach(function (sMessage) {
                    switch (sMessage.type) {
                        case "Error":
                            sHighSeverity = "Negative";
                            break;

                        case "Warning":
                            sHighSeverity = sHighSeverity !== "Negative" ? "Critical" : sHighSeverity;
                            break;

                        case "Success":
                            sHighSeverity = sHighSeverity !== "Negative" && sHighSeverity !== "Critical" ? "Success" : sHighSeverity;
                            break;

                        default:
                            sHighSeverity = sHighSeverity ? "Neutral" : sHighSeverity;
                            break;
                    }
                });

                return sHighSeverity;
            },

            //Display the number of messages with the highest severity
            mpSeverityMessages: function () {
                let sHighSeverityIconType = this.mpTypeFormatter();
                let sHighSeverityMessageType;

                switch (sHighSeverityIconType) {
                    case "Negative":
                        sHighSeverityMessageType = "Error";
                        break;

                    case "Critical":
                        sHighSeverityMessageType = "Warning";
                        break;

                    case "Success":
                        sHighSeverityMessageType = "Success";
                        break;

                    default:
                        sHighSeverityMessageType = !sHighSeverityMessageType ? "Information" : sHighSeverityMessageType;
                        break;
                }

                return this._MessageManager.getMessageModel().oData.reduce(function (iNumberOfMessages, oMessageItem) {
                    return oMessageItem.type === sHighSeverityMessageType ? ++iNumberOfMessages : iNumberOfMessages;
                }, 0) || "";

            },

            handleMessagePopover: function (oEvent) {
                if (!this.oMP) {
                    this.oMP.createMessagePopover();
                }
                this.oMP.toggle(oEvent.getSource());
            },

            handleRequiredField: function (oInput) {
                var sTarget = oInput.getBindingContext().getPath() + "/" + oInput.getBindingPath("value");

                //Remove messages from target
                this.removeMessageFromTarget(sTarget);

                if (!oInput.getValue()) {
                    this._MessageManager.addMessages(
                        new Message({
                            message: "A mandatory field is required",
                            type: MessageType.Error,
                            additionalText: oInput.getLabels()[0].getText(),
                            target: sTarget,
                            processor: this.getView().getModel()
                        })
                    );
                }
            },

            removeMessageFromTarget: function (sTarget) {
                this._MessageManager.getMessageModel().getData().forEach(function (oMessage) {
                    if (oMessage.target === sTarget) {
                        this._MessageManager.removeMessages(oMessage);
                    }
                }.bind(this));
            },

            checkInputConstraints: function (group, oInput) {
                var oBinding = oInput.getBinding("value"),
                    sValueState = "None",
                    message,
                    type,
                    description,
                    sTarget = oInput.getBindingContext().getPath() + "/" + oInput.getBindingPath("value");

                //remove message from target
                this.removeMessageFromTarget(sTarget);

                switch (group) {
                    case "GR1":
                        message = "Invalid Mail";
                        type = MessageType.Error;
                        description = "The value of the email field sould be valid email adress";
                        sValueState = "Error";
                        break;

                    case "GR2":
                        message = "The value should not exceed 40";
                        type = MessageType.Warning;
                        description = "The value of working hours should not exceed 40 hours";
                        sValueState = "Warning";
                        break;

                    default:
                        break;
                }

                try {
                    oBinding.getType().validateValue(oInput.getValue());
                } catch (oException) {
                    this._MessageManager.addMessages(
                        new Message({
                            message: message,
                            type: type,
                            additionalText: oInput.getLabels()[0].getText(),
                            description: description,
                            target: sTarget,
                            processor: this.getView().getModel()
                        })
                    );
                    oInput.setValueState(sValueState);
                }
            },

            onChange: function (oEvent) {
                var oInput = oEvent.getSource();

                if (oInput.getRequired()) {
                    this.handleRequiredField(oInput);
                }

                if (oInput.getLabels()[0].getText() === "Standard Weekly Hours") {
                    this.checkInputConstraints("GR2", oInput);
                }
                /*
                else {
                    this.checkInputConstraints("GR1", oInput)
                }*/

            },
            
            saveData: function () {

                const oView = this.getView();
                let oButton = oView.byId("messagePopover");
                let oNameInput = oView.byId("formContainerPersonal").getItems()[0].getContent()[2];
                let oEmailInput = oView.byId("formContainerPersonal").getItems()[0].getContent()[12];
                let oWeeklyHoursInput = oView.byId("formContainerEmployment").getItems()[0].getContent()[13];
                
                oButton.setVisible(true);

                this.handleRequiredField(oNameInput);
                this.checkInputConstraints("GR1", oEmailInput);
                this.checkInputConstraints("GR2", oWeeklyHoursInput);

                this.oMP.getBinding("items").attachChange(function(oEvent){
                    this.oMP.navigateBack();
                    oButton.setType(this.mpTypeFormatter());
                    oButton.setIcon(this.mpIconFormatter());
                    oButton.setText(this.mpSeverityMessages());                    
                }.bind(this));

                setTimeout(function () {
                    this.oMP.openBy(oButton);
                }.bind(this), 100 )

            },

        });
    });
