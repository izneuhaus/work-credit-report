var app;

$( document ).ready(function() {
    const date = new Date;
    const month = date.toLocaleString('en-us', { month: 'long' });

    $('.month').html(month);

    $('[data-toggle="tooltip"]').tooltip();

    var tables = [
        'House Lookup',
        'Room Lookup',
        'Member Lookup',
        'Report Configuration'
        // , 'Reported Time'
    ];
    
    app = new Vue({
        el: '#app',
        data: function () {
            var obj = {};
    
            $.each(tables, function (index, value) {
                obj[value] = {};
            });
    
            obj['hourTypes'] = [
                'House',
                'Collective',
                'Maintenance'
            ];
    
            return obj;
        },
        mounted: function(){
            this.loadItems();
        },
        methods: {
            loadItems: function(){
    
                // Init variables
                var self = this;
                var app_id = "appQMJeIAFKV48IKi";
                var app_key = "keyjmwAYewm8sDUVi";
    
                var promises = [];
    
                $.each(tables, function (index, value) {
                    promises.push(axios.get(
                        "https://api.airtable.com/v0/"+app_id+"/"+value+"?view=Grid%20view",
                        {
                            headers: { Authorization: "Bearer "+app_key },
                            tableName: value
                        }
                    ))
                });
    
                axios.all(promises).then(function(results){
                    var memberLookup;
                    var houseLookup;
                    var roomLookup;

                    $.each(results, function (index, response) {
                        var tableName = response.config.tableName;
                        var rawData = response.data.records;
                        var formattedData = {};

                        $.each(rawData, function(index, record) {
                            var fields = record.fields;
    
                            if (tableName == tables[0]) {
                                formattedData[record.id] = fields['Name'];
                            }
                            else if (tableName == tables[1]) {
                                formattedData[record.id] = fields['Room #'];
                            }
                            else if (tableName == tables[2]) {
                                houseLookup = self[tables[0]];
                                roomLookup = self[tables[1]];
                                
                                if (fields['House'] && fields['Room']) {
                                    fields['House'] = houseLookup[fields['House'][0]];
                                    fields['Room'] = roomLookup[fields['Room'][0]];
        
                                    if (formattedData[fields['House']] == undefined) {
                                        formattedData[fields['House']] = {};
                                    }
        
                                    formattedData[fields['House']][record.id] = fields;
                                }   
                                
                            }
                            else if (tableName == tables[3]) {
                                memberLookup = self[tables[2]];

                                formattedData[fields.configID] = fields.value;
                            }
                            // reported time table - using Airtable embed instead
                            // else if (tableName == tables[4]) {
                            //     if (fields['House']) {
                            //         fields['House'] = houseLookup[fields['House'][0]];
                            //     }
                            //     if (fields['Name']) {
                            //         fields['Member'] = memberLookup[fields['House']][fields['Member'][0]]['Name'];
                            //     }

                            //     formattedData[index] = fields;
                            // }
                        });                        

                        self[tableName] = formattedData;
                    });
                })
                .catch(function(error){
                    console.log(error)
                });
            },
            getCurrentHours: function (memberData, type, forStyling) {
                var currentHoursRequired = memberData[
                    'Required ' + type + ' Hours (' +
                    (type === 'Maintenance' ? 'Yearly' : 'Monthly') + ')'
                ];
                var hoursDiff = memberData[type + ' Hours Diff'];

                if (forStyling) {
                    if (forStyling == 'positive') {
                        return hoursDiff >= 0;
                    }
                    if (forStyling == 'negative') {
                        return hoursDiff < -currentHoursRequired;
                    }
                }
                else {
                    if (hoursDiff.error) {
                        return '?';
                    }
                    else {
                        var currentHours = hoursDiff + currentHoursRequired;
                        
                        return Math.round(currentHours * 100) / 100;
                    }
                }
            }
        }
    });

    $('#submit > button').click(function() {
        window.open(app._data["Report Configuration"].formUrl);
    });

    $('.nav-link').click(function() {
        var id = $(this).attr('id');

        if (id !== 'help') {
            var reportView = $('#reportView')
            var submissionView = $('#submissionsView')

            $('.nav').find('.active').removeClass('active');
            $(this).addClass('active');

            if (id == 'history') {
                reportView.hide();
                submissionView.show();
            }
            else if (id == 'report') {
                reportView.show();
                submissionView.hide();
            }
        }
    })
});

