

Espo.define('views/fields/link', 'views/fields/base', function (Dep) {

    return Dep.extend({

        type: 'link',

        listTemplate: 'fields/link/list',

        detailTemplate: 'fields/link/detail',

        editTemplate: 'fields/link/edit',

        searchTemplate: 'fields/link/search',

        nameName: null,

        idName: null,

        foreignScope: null,

        AUTOCOMPLETE_RESULT_MAX_COUNT: 7,

        selectRecordsView: 'views/modals/select-records',

        autocompleteDisabled: false,

        createDisabled: false,

        searchTypeList: ['is', 'isEmpty', 'isNotEmpty', 'isNot', 'isOneOf', 'isNotOneOf'],

        data: function () {
            var nameValue = this.model.has(this.nameName) ? this.model.get(this.nameName) : this.model.get(this.idName);
            if (nameValue === null) {
                nameValue = this.model.get(this.idName);
            }
            if (this.mode === 'detail' && !nameValue && this.model.get(this.idName)) {
                nameValue = this.translate(this.foreignScope, 'scopeNames');
            }

            var iconHtml = null;
            if (this.mode === 'detail') {
                iconHtml = this.getHelper().getScopeColorIconHtml(this.foreignScope);
            }
            return _.extend({
                idName: this.idName,
                nameName: this.nameName,
                idValue: this.model.get(this.idName),
                nameValue: nameValue,
                foreignScope: this.foreignScope,
                valueIsSet: this.model.has(this.idName),
                iconHtml: iconHtml
            }, Dep.prototype.data.call(this));
        },

        getSelectFilters: function () {},

        getSelectBoolFilterList: function () {
            return this.selectBoolFilterList;
        },

        getSelectPrimaryFilterName: function () {
            return this.selectPrimaryFilterName;
        },

        getCreateAttributes: function () {},

        setup: function () {
            this.nameName = this.name + 'Name';
            this.idName = this.name + 'Id';

            this.foreignScope = this.options.foreignScope || this.foreignScope;
            this.foreignScope = this.foreignScope || this.model.getFieldParam(this.name, 'entity') || this.model.getLinkParam(this.name, 'entity');

            if ('createDisabled' in this.options) {
                this.createDisabled = this.options.createDisabled;
            }
            var self = this;

            if (this.mode != 'list') {
                this.addActionHandler('selectLink', function () {
                    this.notify('Loading...');

                    var viewName = this.getMetadata().get('clientDefs.' + this.foreignScope + '.modalViews.select') || this.selectRecordsView;

                    this.createView('dialog', viewName, {
                        scope: this.foreignScope,
                        createButton: !this.createDisabled && this.mode != 'search',
                        filters: this.getSelectFilters(),
                        boolFilterList: this.getSelectBoolFilterList(),
                        primaryFilterName: this.getSelectPrimaryFilterName(),
                        createAttributes: (this.mode === 'edit') ? this.getCreateAttributes() : null,
                        mandatorySelectAttributeList: this.mandatorySelectAttributeList,
                        forceSelectAllAttributes: this.forceSelectAllAttributes
                    }, function (view) {
                        view.render();
                        this.notify(false);
                        this.listenToOnce(view, 'select', function (model) {
                            this.clearView('dialog');
                            this.select(model);
                        }, this);
                    }, this);
                });
                this.addActionHandler('clearLink', function () {
                    this.clearLink();
                });
            }

            if (this.mode == 'search') {
                this.addActionHandler('selectLinkOneOf', function () {
                    this.notify('Loading...');

                    var viewName = this.getMetadata().get('clientDefs.' + this.foreignScope + '.modalViews.select') || this.selectRecordsView;

                    this.createView('dialog', viewName, {
                        scope: this.foreignScope,
                        createButton: !this.createDisabled && this.mode != 'search',
                        filters: this.getSelectFilters(),
                        boolFilterList: this.getSelectBoolFilterList(),
                        primaryFilterName: this.getSelectPrimaryFilterName(),
                        multiple: true
                    }, function (view) {
                        view.render();
                        this.notify(false);
                        this.listenToOnce(view, 'select', function (models) {
                            this.clearView('dialog');
                            if (Object.prototype.toString.call(models) !== '[object Array]') {
                                models = [models];
                            }
                            models.forEach(function (model) {
                                this.addLinkOneOf(model.id, model.get('name'));
                            }, this);
                        });
                    }, this);
                });

                this.events['click a[data-action="clearLinkOneOf"]'] = function (e) {
                    var id = $(e.currentTarget).data('id').toString();
                    this.deleteLinkOneOf(id);
                };
            }
        },

        select: function (model) {
            this.$elementName.val(model.get('name'));
            this.$elementId.val(model.get('id'));
            if (this.mode === 'search') {
                this.searchData.idValue = model.get('id');
                this.searchData.nameValue = model.get('name');
            }
            this.trigger('change');
        },

        clearLink: function () {
            this.$elementName.val('');
            this.$elementId.val('');
            this.trigger('change');
        },

        setupSearch: function () {
            this.searchData.oneOfIdList = this.searchParams.oneOfIdList || [];
            this.searchData.oneOfNameHash = this.searchParams.oneOfNameHash || {};
            this.searchData.idValue = this.getSearchParamsData().idValue || this.searchParams.idValue || this.searchParams.value;
            this.searchData.nameValue = this.getSearchParamsData().nameValue ||  this.searchParams.valueName;

            this.events = _.extend({
                'change select.search-type': function (e) {
                    var type = $(e.currentTarget).val();
                    this.handleSearchType(type);
                },
            }, this.events || {});
        },

        handleSearchType: function (type) {
            if (~['is', 'isNot', 'isNotAndIsNotEmpty'].indexOf(type)) {
                this.$el.find('div.primary').removeClass('hidden');
            } else {
                this.$el.find('div.primary').addClass('hidden');
            }

            if (~['isOneOf', 'isNotOneOf', 'isNotOneOfAndIsNotEmpty'].indexOf(type)) {
                this.$el.find('div.one-of-container').removeClass('hidden');
            } else {
                this.$el.find('div.one-of-container').addClass('hidden');
            }
        },

        getAutocompleteUrl: function () {
            var url = this.foreignScope + '?sortBy=name&maxCount=' + this.AUTOCOMPLETE_RESULT_MAX_COUNT;
            var boolList = this.getSelectBoolFilterList();
            var where = [];
            if (boolList) {
                url += '&' + $.param({'boolFilterList': boolList});
            }
            var primary = this.getSelectPrimaryFilterName();
            if (primary) {
                url += '&' + $.param({'primaryFilter': primary});
            }
            return url;
        },

        afterRender: function () {
            if (this.mode == 'edit' || this.mode == 'search') {
                this.$elementId = this.$el.find('input[name="' + this.idName + '"]');
                this.$elementName = this.$el.find('input[name="' + this.nameName + '"]');

                this.$elementName.on('change', function () {
                    if (this.$elementName.val() == '') {
                        this.$elementName.val('');
                        this.$elementId.val('');
                        this.trigger('change');
                    }
                }.bind(this));

                if (this.mode == 'edit') {
                    this.$elementName.on('blur', function (e) {
                        if (this.model.has(this.nameName)) {
                            e.currentTarget.value = this.model.get(this.nameName);
                        }
                    }.bind(this));
                } else if (this.mode == 'search') {
                    this.$elementName.on('blur', function (e) {
                        e.currentTarget.value = '';
                    }.bind(this));
                }

                var $elementName = this.$elementName;

                if (!this.autocompleteDisabled) {
                    this.$elementName.autocomplete({
                        serviceUrl: function (q) {
                            return this.getAutocompleteUrl(q);
                        }.bind(this),
                        paramName: 'q',
                        minChars: 1,
                        autoSelectFirst: true,
                           formatResult: function (suggestion) {
                            return suggestion.name;
                        },
                        transformResult: function (response) {
                            var response = JSON.parse(response);
                            var list = [];
                            response.list.forEach(function(item) {
                                list.push({
                                    id: item.id,
                                    name: item.name,
                                    data: item.id,
                                    value: item.name,
                                    attributes: item
                                });
                            }, this);
                            return {
                                suggestions: list
                            };
                        }.bind(this),
                        onSelect: function (s) {
                            this.getModelFactory().create(this.foreignScope, function (model) {
                                model.set(s.attributes);
                                this.select(model);
                            }, this);
                        }.bind(this)
                    });

                    this.once('render', function () {
                        $elementName.autocomplete('dispose');
                    }, this);

                    this.once('remove', function () {
                        $elementName.autocomplete('dispose');
                    }, this);


                    if (this.mode == 'search') {
                        var $elementOneOf = this.$el.find('input.element-one-of');
                        $elementOneOf.autocomplete({
                            serviceUrl: function (q) {
                                return this.getAutocompleteUrl(q);
                            }.bind(this),
                            minChars: 1,
                            paramName: 'q',
                               formatResult: function (suggestion) {
                                return suggestion.name;
                            },
                            transformResult: function (response) {
                                var response = JSON.parse(response);
                                var list = [];
                                response.list.forEach(function(item) {
                                    list.push({
                                        id: item.id,
                                        name: item.name,
                                        data: item.id,
                                        value: item.name
                                    });
                                }, this);
                                return {
                                    suggestions: list
                                };
                            }.bind(this),
                            onSelect: function (s) {
                                this.addLinkOneOf(s.id, s.name);
                                $elementOneOf.val('');
                            }.bind(this)
                        });


                        this.once('render', function () {
                            $elementOneOf.autocomplete('dispose');
                        }, this);

                        this.once('remove', function () {
                            $elementOneOf.autocomplete('dispose');
                        }, this);
                    }
                }

                $elementName.on('change', function () {
                    if (!this.model.get(this.idName)) {
                        $elementName.val(this.model.get(this.nameName));
                    }
                }.bind(this));
            }

            if (this.mode == 'search') {
                var type = this.$el.find('select.search-type').val();
                this.handleSearchType(type);

                if (~['isOneOf', 'isNotOneOf', 'isNotOneOfAndIsNotEmpty'].indexOf(type)) {
                    this.searchData.oneOfIdList.forEach(function (id) {
                        this.addLinkOneOfHtml(id, this.searchData.oneOfNameHash[id]);
                    }, this);
                }
            }
        },

        getValueForDisplay: function () {
            return this.model.get(this.nameName);
        },

        validateRequired: function () {
            if (this.isRequired()) {
                if (this.model.get(this.idName) == null) {
                    var msg = this.translate('fieldIsRequired', 'messages').replace('{field}', this.getLabelText());
                    this.showValidationMessage(msg);
                    return true;
                }
            }
        },

        deleteLinkOneOf: function (id) {
            this.deleteLinkOneOfHtml(id);

            var index = this.searchData.oneOfIdList.indexOf(id);
            if (index > -1) {
                this.searchParams.oneOfIdList.splice(index, 1);
            }
            delete this.searchParams.oneOfNameHash[id];
        },

        addLinkOneOf: function (id, name) {
            if (!~this.searchData.oneOfIdList.indexOf(id)) {
                this.searchData.oneOfIdList.push(id);
                this.searchData.oneOfNameHash[id] = name;
                this.addLinkOneOfHtml(id, name);
            }
        },

        deleteLinkOneOfHtml: function (id) {
            this.$el.find('.link-one-of-container .link-' + id).remove();
        },

        addLinkOneOfHtml: function (id, name) {
            var $container = this.$el.find('.link-one-of-container');
            var $el = $('<div />').addClass('link-' + id).addClass('list-group-item');
            $el.html(name + '&nbsp');
            $el.prepend('<a href="javascript:" class="pull-right" data-id="' + id + '" data-action="clearLinkOneOf"><span class="fas fa-times"></a>');
            $container.append($el);

            return $el;
        },

        fetch: function () {
            var data = {};
            data[this.nameName] = this.$el.find('[name="'+this.nameName+'"]').val() || null;
            data[this.idName] = this.$el.find('[name="'+this.idName+'"]').val() || null;

            return data;
        },

        fetchSearch: function () {
            var type = this.$el.find('select.search-type').val();
            var value = this.$el.find('[name="' + this.idName + '"]').val();

            if (type == 'isEmpty') {
                var data = {
                    type: 'isNull',
                    field: this.idName,
                    data: {
                        type: type
                    }
                };
                return data;
            } else if (type == 'isNotEmpty') {
                var data = {
                    type: 'isNotNull',
                    field: this.idName,
                    data: {
                        type: type
                    }
                };
                return data;
            } else if (type == 'isOneOf') {
                var data = {
                    type: 'in',
                    field: this.idName,
                    value: this.searchData.oneOfIdList,
                    oneOfIdList: this.searchData.oneOfIdList,
                    oneOfNameHash: this.searchData.oneOfNameHash,
                    data: {
                        type: type
                    }
                };
                return data;
            } else if (type == 'isNotOneOf') {
                var data = {
                    type: 'or',
                    value: [
                        {
                            type: 'notIn',
                            attribute: this.idName,
                            value: this.searchData.oneOfIdList
                        },
                        {
                            type: 'isNull',
                            attribute: this.idName
                        }
                    ],
                    field: this.idName,
                    oneOfIdList: this.searchData.oneOfIdList,
                    oneOfNameHash: this.searchData.oneOfNameHash,
                    data: {
                        type: type
                    }
                };
                return data;
            } else if (type == 'isNotOneOfAndIsNotEmpty') {
                var data = {
                    type: 'notIn',
                    field: this.idName,
                    value: this.searchData.oneOfIdList,
                    oneOfIdList: this.searchData.oneOfIdList,
                    oneOfNameHash: this.searchData.oneOfNameHash,
                    data: {
                        type: type
                    }
                };
                return data;
            }  else if (type == 'isNot') {
                if (!value) {
                    return false;
                }
                var nameValue = this.$el.find('[name="' + this.nameName + '"]').val();
                var data = {
                    type: 'or',
                    value: [
                        {
                            type: 'notEquals',
                            attribute: this.idName,
                            value: value
                        },
                        {
                            type: 'isNull',
                            attribute: this.idName
                        }
                    ],
                    field: this.idName,
                    data: {
                        type: type,
                        idValue: value,
                        nameValue: nameValue
                    }
                };
                return data;
            } else if (type == 'isNotAndIsNotEmpty') {
                if (!value) {
                    return false;
                }
                var nameValue = this.$el.find('[name="' + this.nameName + '"]').val();
                var data = {
                    type: 'notEquals',
                    field: this.idName,
                    value: value,
                    data: {
                        type: type,
                        idValue: value,
                        nameValue: nameValue
                    }
                };
                return data;
            } else {
                if (!value) {
                    return false;
                }
                var nameValue = this.$el.find('[name="' + this.nameName + '"]').val();
                var data = {
                    type: 'equals',
                    field: this.idName,
                    value: value,
                    data: {
                        type: type,
                        idValue: value,
                        nameValue: nameValue
                    }
                };
                return data;
            }
        },

        getSearchType: function () {
            return this.getSearchParamsData().type || this.searchParams.typeFront || this.searchParams.type;
        }

    });
});
