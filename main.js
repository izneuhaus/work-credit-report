var app;

$( document ).ready(function() {
    const date = new Date;
    const month = date.toLocaleString('en-us', { month: 'long' });

    $('.month').html(month);

    $('[data-toggle="tooltip"]').tooltip();

    var tables = [
        'House Lookup',
        'Room Lookup',
        'Member Lookup'
    ];

    $.get('help.html', function(data) {
        $('#helpHtml').html(data);
    })

    $.getJSON('config.json').then(function(CONFIG) {
        document.title = CONFIG.reportTitle;
        $('#title > h3').text(CONFIG.reportTitle);
        $('#submissionsView').attr('src', 'https://airtable.com/embed/' + CONFIG.airtable.surveyHash + '?backgroundColor=red&viewControls=on')

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
            updated: function() {
                $('.collapse').each(function(index, collapse) {
                    var id = $(collapse).get(0).id;
    
                    if (localStorage.getItem(id) === 'false') {
                        collapseOnLoad(id);
                    }
                });
            },
            methods: {
                loadItems: function(){
        
                    // Init variables
                    var self = this;
                    var app_id = CONFIG.airtable.baseId;
                    var app_key = CONFIG.airtable.apiKey;
        
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
                            });                        
    
                            self[tableName] = formattedData;
                        });
    
                        var url = window.location.pathname;
                        var filename = url.substring(url.lastIndexOf('/')+1);
    
                        if (filename == 'dashboard.html') {
                            if (getUrlParameter('id') && getUrlParameter('house')) {
                                var memberId = getUrlParameter('id');
                                var memberHouse = getUrlParameter('house');
                        
                                loadPersonalizedView(memberId, memberHouse, CONFIG.airtable.surveyHash)
                            }
                        }
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
    });

    $('#submit > button').click(function() {
        window.open("https://airtable.com/" + CONFIG.airtable.surveyHash);
    });

    $('#backToReport > button').click(function() {
        window.location.href="./index.html";
    });

    $('.nav-link').click(function() {
        var id = $(this).attr('id');

        if (id !== 'help') {
            var reportView = $('#reportView');
            var submissionView = $('#submissionsView');
            var quickSubmitView = $('#quickSubmitView');

            $('.nav').find('.active').removeClass('active');
            $(this).addClass('active');

            if (id == 'history') {
                reportView.hide();
                quickSubmitView.hide();
                submissionView.show();
            }
            else if (id == 'report') {
                submissionView.hide();
                quickSubmitView.hide();
                reportView.show();
            }
        }
    });    

    $('#reportView').on('click', '.quick-submit', function() {
        var memberId = $(this).data('id');
        var memberHouse = $(this).data('house');

        window.location.href='./dashboard.html?id=' + memberId + '&house=' + memberHouse;
    });

    $('#reportView').on('shown.bs.collapse', function (e) {
        localStorage.setItem(e.target.id, true);
    });

    $('#reportView').on('hidden.bs.collapse', function (e) {
        localStorage.setItem(e.target.id, false);
    });
});

function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
};

function collapseOnLoad(id) {
    $('#' + id).removeClass('show');
}

function loadPersonalizedView(memberId, memberHouse, surveyHash) {
    var header = $('#header');
    var reportView = $('#reportView');
    var submissionView = $('#submissionsView');
    var quickSubmitView = $('#quickSubmitView');

    var memberData = app._data['Member Lookup'][memberHouse][memberId];

    $('#submitDashboard').click(function() {
        window.location.href = 
            'https://airtable.com/embed/' + surveyHash + '?backgroundColor=red' +
            '&prefill_Member=' + memberData['Name'] +
            '&prefill_House=' + memberData['House'];
    });

    $('.hoursProgressDisplay').each(function(index, item) {
        var hoursType = $(item).data('hourstype');
        var progressDisplay = new ldBar(item, {
            'preset': 'circle'
        });
        var label = $(item).find('.ldBar-label');

        var currentHours = app.getCurrentHours(memberData, hoursType);
        var requiredHours = memberData['Required ' + hoursType + ' Hours (' + (hoursType === 'Maintenance' ? 'Yearly' : 'Monthly') + ')'];

        if (requiredHours === 0) {
            $(item).parent().hide();
        }

        var progressPercentage = (currentHours / requiredHours) * 100;

        progressDisplay.set(progressPercentage);

        $(item).find('.progress-label').remove();
        $('<div class="progress-label">' + (progressPercentage > 100 ? requiredHours : currentHours) + '/' + requiredHours + '</div>').appendTo($(item));
    })

    $('.otherProgressDisplay').each(function(index, item) {
        var otherType = $(item).data('othertype');
        var progressDisplay = new ldBar(item, {
            'preset': 'circle',

        });
        var label = $(item).find('.ldBar-label');

        var currentOtherProgress = memberData['Completed ' + otherType + ' (Current Month)'] || 0;
        var otherRequirement = memberData['Required ' + otherType + ' (Monthly)'];

        if (otherRequirement === 0) {
            $(item).parent().hide();
        }

        var progressPercentage = (currentOtherProgress / otherRequirement) * 100;

        progressDisplay.set(progressPercentage)
        $(item).find('.progress-other-label').remove();
        $('<div class="progress-other-label">' + currentOtherProgress + '/' + otherRequirement + '</div>').appendTo($(item));
    })

    var date = new Date;
    date = date.toLocaleString('default', { month: 'long', year: 'numeric' })

    $('#quickSubmitHeader').html('<h4>' + memberData['Name'] + '</h4><h5>' + date + '</h5>');

    header.hide();
    reportView.hide();
    submissionView.hide();
    quickSubmitView.show();
}