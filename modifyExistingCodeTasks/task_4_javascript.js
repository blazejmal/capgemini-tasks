(function () {
    var tableName = $sp.getParameter('table');
    var sysId = $sp.getParameter('sys_id');
    var record = sn_std_tkt_api.TicketConfig.getTicketRecord(tableName, sysId);
    data.isExternalUser = !gs.hasRole('snc_internal');
    data.is_new_order = (($sp.getParameter("is_new_order") + '') === "true");
    data.canRead = hasReadAcces(record);
    if (!data.canRead)
        return;
    if ($sp.getParameter('headless') == 'true')
        data.headless = true;
    else if ($sp.getParameter('headless') == 'false')
        data.headless = false;
    else if ($sp.getParameter('headless') == null)
        data.headless = false;
    else
        return;
    if (data.headless)
        data.hideHeader = true;
    tableName = record.getTableName();
    sysId = record.getUniqueValue();
    var sdField;
    var headerFields = [];
    var showDomainState = false; //URL has domain table
    if (tableName != 'universal_request') { //Check if universal_request field is present and it is a universal request
        if (record.isValidField('universal_request') && !record.universal_request.nil()) {
            data.urLink = '?id=standard_ticket&table=universal_request&sys_id=' + record.universal_request.sys_id;
            var ur = sn_std_tkt_api.TicketConfig.getTicketRecord('universal_request', record.universal_request);
            if (!hasReadAcces(ur)) {
                readHeaderFields(record);
                showDomainState = true;
            } else {
                data.number = $sp.getField(ur, 'number');
                headerFields.push($sp.getField(ur, 'sys_created_on'));
                headerFields.push($sp.getField(record, 'sys_updated_on'));

                //START OF CHANGES FOR TASK
                // Add to headerFields new field assignment_group
                headerFields.push($sp.getField(record, 'assignment_group'));
                //END OF CHANGES FOR TASK

                headerFields.push($sp.getField(ur, 'state'));
                sdField = $sp.getField(ur, 'short_description');
            } //URL-non primary ticket
            if (record.universal_request.primary_task != record.sys_id)
                data.primary_ticket_link = '?id=standard_ticket&table=universal_request&sys_id=' + record.universal_request;
        } //It is a domain ticket
        else {
            readHeaderFields(record);
            showDomainState = true;
        }
    } //URL-Table name is universal request
    else { //Domain ticket is created
        if (!record.primary_task.nil()) {
            data.urLink = '?id=standard_ticket&table=universal_request&sys_id=' + record.sys_id;
            var primary_table = record.primary_task.getRefRecord().getTableName();
            var primaryGR = sn_std_tkt_api.TicketConfig.getTicketRecord(primary_table, record.primary_task + '');
            data.canReadPrimary = hasReadAcces(primaryGR);
            if (!data.canReadPrimary) {
                readHeaderFields(record);
                record = sn_std_tkt_api.TicketConfig.getTicketRecord(primary_table, record.primary_task);
            } else { //can read primary ticket
                sdField = $sp.getField(record, 'short_description');
                data.number = $sp.getField(record, 'number');
                headerFields.push($sp.getField(record, 'sys_created_on'));
                headerFields.push($sp.getField(primaryGR, 'sys_updated_on'));
                headerFields.push($sp.getField(record, 'state'));

                //START OF CHANGES FOR TASK 
                // Add to headerFields new field assignment_group
                headerFields.push($sp.getField(record, 'assignment_group'));
                //END OF CHANGES FOR TASK  

                record = sn_std_tkt_api.TicketConfig.getTicketRecord(primary_table, record.primary_task);
                tableName = record.getTableName();
                sysId = record.getUniqueValue();
            }
        } //No domain ticket assigned
        else
            readHeaderFields(record);
    }
    if (sdField == null || !sdField.value) { //Use number if SD is not there
        data.isEmpty = true;
        sdField = data.number;
    }
    data.title = sdField.display_value;
    data.headerFields = headerFields;
    data.requestSubmitMsg = gs.getMessage("Thank You. Your request {0} has been submitted.", data.number.display_value);
    data.canReadConfig = hasReadAcces(record);
    if (!data.canReadConfig)
        return;
    var config = sn_std_tkt_api.TicketConfig.getConfig(tableName, record.sys_domain);
    if (config) {
        if (showDomainState && config.state_field != 'state') {
            var configState = $sp.getField(record, config.state_field);
            headerFields.forEach(function (field, index, that) {
                if (field.name == 'state') {
                    that[index] = configState;
                }
            })
        }
        data.show_info_widget = config.show_info_widget;
        if (!data.show_info_widget)
            showConfigTicketFields(config, record);
        else
            showTicketWidget(config, tableName, sysId);
        data.table = tableName;
        data.sys_id = sysId;
        showActionWidget(config, tableName, sysId);
        if (!record.description.canRead())
            return;
        showDescription(config, record);
    }
    function hasReadAcces(record) {
        return (record != null && record.isValid() && record.canRead());
    }
    function readHeaderFields(record) {
        sdField = $sp.getField(record, 'short_description');
        data.number = $sp.getField(record, 'number');
        headerFields = $sp.getFields(record, 'sys_created_on, sys_updated_on, state');
    }
    function showConfigTicketFields(config, record) {
        var fieldNames = [];
        if (config.info_fields)
            fieldNames = config.info_fields.split(',');
        var fields = [];
        if (record.getTableName() == 'sc_req_item' && !record.cat_item.nil()) {
            var catalogItemJS = new sn_sc.CatItem(record.cat_item);
            var cartItemDetail = catalogItemJS.getItemSummary(true);
        }
        fieldNames.forEach(function (fName) {
            if ((!fName || fName == ''))
                return;
            var hidePrice = (fName == 'price' || fName == 'recurring_price') && !cartItemDetail.show_price;
            if (hidePrice)
                return;
            var hideQuantity = (fName == 'quantity') && !cartItemDetail.show_quantity;
            if (hideQuantity)
                return;
            var fElement = record.getElement(fName);
            if (!fElement)
                return;
            if (!fElement.canRead())
                return;
            var type = fElement.getED().getInternalType();
            if (type == 'glide_list')
                loadGlideListFieldInfo(fElement, fName, type, record, fields);
            else if (type == 'workflow')
                loadWorkflowFieldInfo(fElement, fName, type, record, fields);
            else {
                var f = {
                    display_value: (fName == 'recurring_price' && !record.recurring_frequency.nil()) ? (fElement.getDisplayValue() + " " + record.getDisplayValue('recurring_frequency')) : fElement.getDisplayValue(),
                    label: fElement.getLabel(),
                    name: fElement.getName(),
                    type: type,
                    value: (fName == 'sys_updated_on' && record.getValue("sys_mod_count") <= 0) ? '' : fElement.toString()
                };
                if (!f.value)
                    return;
                if (type == 'reference') {
                    var reference = fElement.getReferenceTable();
                    f.reference = reference;
                    if (reference == 'sys_user') {
                        f.user = {
                            userID: f.value,
                            name: f.display_value,
                            avatar: GlideAvatarFinder.getAvatarPath(f.value),
                            initials: buildInitials(f.display_value)
                        }
                    }
                }
                fields.push(f);
            }
        });
        data.fields = fields;
    }
    function loadGlideListFieldInfo(fElement, fName, type, record, fields) {
        var val = fElement.toString();
        var f = {
            display_value: fElement.getDisplayValue() ? fElement.getDisplayValue().split(",") : '',
            label: fElement.getLabel(),
            type: type,
            value: val ? val.split(",") : '',
            reference: fElement.getED().getReference()
        };
        if (!f.value)
            return;
        var gReference = fElement.getED().getReference();
        if (gReference == 'sys_user') {
            f.user = [];
            for (var u = 0; u < f.value.length; u++) {
                f.user.push(person = {
                        userID: f.value[u],
                        name: f.display_value[u],
                        avatar: GlideAvatarFinder.getAvatarPath(f.value[u]),
                        initials: buildInitials(f.display_value[u])
                    })
            }
        }
        fields.push(f);
    }
    function loadWorkflowFieldInfo(fElement, fName, type, record, fields) {
        var f = {
            display_value: fElement.getDisplayValue(),
            label: fElement.getLabel(),
            type: type,
            value: fElement.toString()
        };
        f.stageWidget = $sp.getWidget('request_item_workflow_stages', {
                req_item_id: sysId
            });
        fields.push(f);
    }
    function showTicketWidget(config, tableName, sysId) {
        var widgetParam = config.info_widget_param if (widgetParam)
                widgetParam = JSON.parse(widgetParam)else
                        widgetParam = {};
                    widgetParam.table = tableName;
            widgetParam.sys_id = sysId;
        data.info_widget = $sp.getWidget(config.info_widget, widgetParam);
    }
    function showActionWidget(config, tableName, sysId) {
        var widgetParam = config.action_widget_param if (widgetParam)
                widgetParam = JSON.parse(widgetParam)else
                        widgetParam = {};
                    widgetParam.table = tableName;
            widgetParam.sys_id = sysId;
        data.actionWidget = $sp.getWidget(config.action_widget, widgetParam);
    }
    function showDescription(config, record) {
        if (config.show_description == 'always')
            data.description = $sp.getField(record, 'description').display_value;
        else if (config.show_description == 'no_variable') {
            var variables = record.variables.getElements(true);
            if (variables.length == 0)
                data.description = $sp.getField(record, 'description').display_value;
        }
    }
    function buildInitials(name) {
        if (!name)
            return "--";
        var initialMatchRegex = /^[A-ZÀ-Ÿ]|^[\u3040-\u309f]|^[\u30a0-\u30ff]|^[\uff66-\uff9f]|^[\u4e00-\u9faf]/;
        // Included Hiragana, Katakana, CJK Unified Ideographs and Halfwidth and Fullwidth Forms Blocks
        // Hiragana -> Japanese words, Katakana -> foreign words
        // CJK Unified Ideographs -> modern Chinese, Japanese, Korean and Vietnamese characters
        var initials = name.split(" ").map(function (word) {
                return word.toUpperCase();
            }).filter(function (word) {
                return word.match(initialMatchRegex);
            }).map(function (word) {
                return word.substring(0, 1);
            }).join("");
        return (initials.length > 3) ? initials.substr(0, 3) : initials;
    }
})()
