$(document).ready(function() {


	$('#container').hide();
	$('#login').click(function() {
		FB.getLoginStatus(function(response) {
			if(response.status == 'connected') {
				FB.logout(function(){
					$('#name').text('Visitante');
					$('#login').text('entrar');
				});
			} else {
				FB.login(function(response) {
					checkLoginState();
				}, { scope: 'publish_actions,user_groups'});
			}

			checkLoginState();
		});
	});

	$('#send').click(function(e) {
		e.preventDefault();
		var body = {};
		var message = $('#message');
		var link = $('#link');

		if(message.val().length > 0) {
			body['message'] = message.val();
		}

		if(link.val().length > 0) {
			body['link'] = link.val();
		}

		$.each($('#groups').tokenfield('getTokens'), function(index, item) {
			FB.api('/' + item.value + '/feed', 'post', body, function(response) {
				var result;
				if (!response || response.error) {
					result = '<span class="label label-danger">' + response.error.message + ' (Cod ' + response.error.code + ')</span>';
				} else {
					result = '<span class="label label-success">' + response.id + '</span>';
				}

				$('<div class="col-md-10">' + item.label + '</div><div class="col-md-2">' + result + '</div>').appendTo('#queue');
			});
		});
	});

	var checkLoginState = function() {
		FB.getLoginStatus(function(response) {
			statusChangeCallback(response);
		});
	}


	var done = false;
	var optionsxablau = [];
	var getData = function() {
		FB.api('/me?fields=name,groups{id,name}', function(response) {
			$('#name').text(response.name);
			$('#login').text('sair');

			var groups = response.groups.data;
			var more = [];

			if (response.groups.hasOwnProperty('paging') && response.groups.paging.hasOwnProperty('next')) {
				next(response.groups.paging.next);
			}

			var gg = setInterval(function () {
				if (done) {
					console.info("xablau", optionsxablau)
					buildtokens(optionsxablau);
					clearInterval(gg);
				}
			}, 500);

		});
	};

	var next = function (url) {
		$.get(url).then(function (response) {
			var groups = response.data;
			$.each(groups, function(index, group) {
				optionsxablau.push({'value': group.id, 'label': group.name});
			});

			if (response.hasOwnProperty('paging') && response.paging.hasOwnProperty('next')) {
				next(response.paging.next);
			} else {
				done = true;
			}
		})
	}

	var buildtokens = function (options) {
			var engine = new Bloodhound({
				local: options,
				datumTokenizer: function(d) {
					return Bloodhound.tokenizers.whitespace(d.label); 
				},
				queryTokenizer: Bloodhound.tokenizers.whitespace,   
			});

			engine.initialize();

			$('#groups').tokenfield({
				typeahead: [null, { source: engine.ttAdapter(), displayKey: 'label' }]
			});

			$('#groups').on('tokenfield:createtoken', function (event) {
				var existingTokens = $(this).tokenfield('getTokens');
				$.each(existingTokens, function(index, token) {
					if (token.value === event.attrs.value)
						event.preventDefault();
				});
			}).on('tokenfield:createdtoken', function (e) {
				var valid = false;
				for(var i = 0; i < options.length; i++) {
					if (options[i].value == e.attrs.value) {
						valid = true;
						break;
					}
				}

				if (!valid) {
					$(e.relatedTarget).addClass('invalid');
				}
			});
	}

	var statusChangeCallback = function(response) {
		if(response.status == 'connected') {
			getData();
		} else if (response.status == 'not_authorized') {
			$('#status').text('Falha ao tentar conectar. Acesso não autorizado');
		} else {
			$('#status').text('Você não está conectado no Facebook.')
		}
	};

	$.ajaxSetup({ cache: true });
	$.getScript('//connect.facebook.net/pt_BR/all.js', function(){
		FB.init({
			appId: 'YOUR_APP_ID_HERE',
		});
		FB.getLoginStatus(statusChangeCallback);
	});
});
