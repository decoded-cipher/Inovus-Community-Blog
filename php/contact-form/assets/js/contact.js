var translations, lang;
jQuery.getJSON('php/contact-form/translations.json', function (json) {
    translations = json;
    lang = json.default_lang;
});

function parseMessage(str, vars) {
    var i, pattern, re, n = vars.length;
    for (i = 0; i < n; i++) {
        pattern = "\\{\\$" + (i + 1) + "\\}";
        re = new RegExp(pattern, "g");
        str = str.replace(re, vars[i]);
    }
    return str;
}

function showMessageBox($msg, html) {
    $('html, body').animate({
        scrollTop: $("#contact").offset().top
    }, 1000);
    $msg.slideUp('fast', function () {
        $(this).html(html).slideDown('fast');
    });
}

function getErrorsHtml(errors) {
    var errors_string = '';
    errors_string += '<div class="panel panel-danger">';
    errors_string += '<div class="panel-heading"><h5 class="panel-title h5-small">' + translations.form.error.title[lang] + '</h5></div>';
    errors_string += '<div class="panel-body"><ul>';
    for (var i = 0; i < errors.length; i++) {
        errors_string += '<li>' + errors[i] + '</li>';
    }
    errors_string += '</ul></div>';
    errors_string += '</div>';
    return errors_string;
}

function getSuccessHtml(success) {
    var success_string = '';
    success_string += '<div class="alert alert-success">';
    success_string += '<p>' + success + '</p>';
    success_string += '</div>';
    return success_string;
}

function validateTheField($field) {
    var type = $field.prop('type'),
        name = $field.prop('name'),
        val = $field.val(),
        msg;
    if ($field.prop('required') && $field.val() === '') {
        msg = parseMessage(translations.form.error.required[lang], [name]);
        return msg;
    }
    switch (type) {
        case 'email':
            var aPos = val.indexOf("@"),
                dPos = val.lastIndexOf(".");
            if (aPos < 1 || dPos < aPos + 2 || dPos + 2 >= val.length) {
                msg = parseMessage(translations.form.error.email[lang], [name]);
                return msg;
            }
            break;
        case 'tel':
        case 'number':
            if (!$.isNumeric(val)) {
                msg = parseMessage(translations.form.error.numeric[lang], [name]);
                return msg;
            }
            break;
    }
}

function validateTheForm($form) {
    var errors = [],
        passed = true,
        $msg = $form.find('.message'),
        html;
    $form.find('[required]').each(function (i) {
        var err = validateTheField($(this));
        if (err) {
            errors.push(err);
        }
    });
    if (errors.length) {
        passed = false;
        html = getErrorsHtml(errors);
        showMessageBox($msg, html);
        recaptchaCallback();
    }
    return passed;
}

function resetFormButton($submit, submit_text) {
    jQuery('<button style="margin-left:5px;" class="btn btn-lg btn-success"><span class="glyphicon glyphicon-refresh" aria-hidden="true"></span> ' + translations.form.reset[lang] + '</button>').insertAfter('.btn-primary').click(function (e) {
        e.preventDefault();
        if ($('#g-recaptcha').length) {
            grecaptcha.reset();
        }
        jQuery('input.form-control, textarea.form-control').val('');
        jQuery('.alert').remove();
        jQuery(this).fadeOut('slow', function () {
            jQuery(this).remove();
            $submit.html('<span class="glyphicon glyphicon-cloud-upload" aria-hidden="true"></span> ' + submit_text).removeAttr('disabled');
        });
    });
}

function recaptchaCallback() {
    console.log('resetting google recaptcha');
    if ($('#g-recaptcha').length) {
        grecaptcha.reset();
    }
}
jQuery(document).ready(function ($) {
    $('form.ucf').each(function () {
        var $form = $(this),
            $msg = $form.find('.message'),
            $submit = $form.find('.btn-primary'),
            submit_txt = $submit.text(),
            action = $form.prop('action'),
            data;
        $msg.fadeOut(0);
        $form.submit(function (e) {
            e.preventDefault();
            if (validateTheForm($form)) {
                data = new FormData($form[0]);
                $('.progress-container').append('<div class="progress progress-striped active">' +
                    '<div class="progress-bar progress-bar-info" style="width: 0%;"></div>' +
                    '</div>');
                $submit.html('<span class="glyphicon glyphicon-cloud-upload" aria-hidden="true"></span> ' + translations.form.button_text[lang]).attr('disabled', 'disabled');
                $.ajax({
                    url: action,
                    type: 'POST',
                    data: data,
                    processData: false,
                    contentType: false,
                    xhr: function () {
                        var xhr = $.ajaxSettings.xhr();
                        if (xhr.upload) {
                            xhr.upload.addEventListener('progress', function (evt) {
                                var percent = (evt.loaded / evt.total) * 100;
                                console.log(percent);
                                $form.find('.progress-bar').width(percent + "%");
                            }, false);
                        }
                        return xhr;
                    }
                }).done(function (data) {
                    if (data.substring(0, 1) !== "{") {
                        showMessageBox($msg, '<div class="alert alert-danger"><p>' + translations.form.error.title[lang] + '</p></div>');
                        window.console.log(data);
                        $submit.html('<span class="glyphicon glyphicon-cloud-upload" aria-hidden="true"></span> ' + submit_txt).removeAttr('disabled');
                        return;
                    }
                    data = $.parseJSON(data);
                    if (data.errors) {
                        recaptchaCallback();
                        showMessageBox($msg, getErrorsHtml(data.errors));
                        $submit.html(submit_txt).removeAttr('disabled');
                    }
                    if (data.success) {
                        showMessageBox($msg, getSuccessHtml(translations.form.success.title[lang]));
                        $submit.html('<span class="glyphicon glyphicon-thumbs-up" aria-hidden="true"></span> ' + translations.form.success.button_text[lang]).attr('disabled', 'disabled');
                        resetFormButton($submit, submit_txt);
                    }
                    if (data.redirect) {
                        window.location.href = data.redirect;
                    } else {
                        $('.progress-container').html('');
                    }
                }).fail(function (data) {
                    showMessageBox($msg, '<div class="alert alert-danger"><p>' + translations.form.error.title[lang] + '</p></div>');
                    $('.progress-container').html('');
                    $submit.html('<span class="glyphicon glyphicon-cloud-upload" aria-hidden="true"></span> ' + submit_txt).removeAttr('disabled');
                });
            }
        });
    });
});