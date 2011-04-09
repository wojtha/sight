var isSighted = document.body.classList.contains('sighted');
if ((document.body && document.body.firstChild.tagName == 'PRE' && document.querySelectorAll('link').length == 0) || isSighted)
(function() {
    
    RegExp.escape = function(str)
    {
      var specials = new RegExp("[.*+?|()\\[\\]{}\\\\]", "g"); // .*+?|()[]{}\
      return str.replace(specials, "\\$&");
    };
    
    var load = function(uri, cb) {
        if (!uri) return false;
        var kind = uri.match(/\.(\w+)$/).pop();
        if (kind == 'css') {
            var link = document.createElement('link');
            link.setAttribute('type', 'text/css');
            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('media', 'screen');
            link.setAttribute('href', chrome.extension.getURL(uri));
            document.head && document.head.appendChild(link);
        }
    };
    
    chrome.extension.sendRequest({preferences: true}, function(response) {
        var prefs = response;
        var lang = prefs.lang;

        if (!lang) {
            var table = [
                   "cpp", ["c", "h", "cpp", "c++", "hpp", "h++"],
                   "csharp", ["cs"],
                   "css", ["css"],
                   "desktop", ["desktop"],
                   "diff", ["diff", "patch"],
                   "java", ["java", "class"],
                   "javascript", ["js", "json"],
                   "objc", ["m", "mm"],
                   "perl", ["pl", "pm", "perl"],
                   "php", ["php", "phtml", "phps", "module", "inc", "test"],
                   "python", ["py"],
                   "ruby", ["rakefile", "gemfile", "rb"],
                   "html", ["htm", "html", "xhtml"],
                   "xml", ["xml", "atom", "rss"],
                   "sql", ["sql"],
                   "delphi", ["pas"],
                   "bash", ["sh", "bash", "zsh", "shell"],
                   "lisp", ["lsp", "lisp", "cl", "el", "scm"],
                   "tex", ["tex"],
                   "scala", ["scala", "scl", "sca", "scb"],
                   "avrasm", ["asm", "s"],
                   "lua", ["lua"],
                   "smalltalk", ["st", "sm", "sll"]
            ];
        
            var extension = document.location.href.match(/\.(\w+)$/) ||
                            document.location.href.match(/format=(\w+)/);
            if (extension && extension.length > 0) {
                extension = extension[1]
                for (var e = table.length - 1; e >= 0; e -= 2)
                    if (table[e].some(function(g) { return extension == g })) {
                        lang = table[e - 1];
                        break;
                    }
            }
            if (!lang) {
                var url = document.location.href.split('/').pop().toLowerCase();
                for (var e = table.length - 1; e >= 0; e -= 2)
                    if (table[e].some(function(g) {
                        return url.match(new RegExp(RegExp.escape('.' + g) + '\\W'))
                    })) {
                        lang = table[e - 1];
                        extension = table[e].filter(function(g) { return url.match(new RegExp(RegExp.escape('.' + g) + '\\W')) })[0]
                        break;
                    }

            }

            if (!lang) {
                var req = new XMLHttpRequest();
                req.open("HEAD", document.location.href, false);
                req.onreadystatechange = function() {
                    if (req.readyState == 4 && req.status >= 200 && req.status < 300) {
                        var content_type = req.getResponseHeader('Content-Type');
                        if (content_type && content_type.length > 0) {
                            content_type = content_type.toLowerCase().split(';').shift().split('/').pop();
                            lang = table.filter(function(i){
                                return typeof i == 'string' && content_type.match(new RegExp(RegExp.escape(i)))
                            }).shift();
                            if (!lang) {
                                lang = table.filter(function(i){
                                    return typeof i == 'object' && i.some(function(g) {
                                        return g == content_type.trim()
                                    })
                                }).shift();
                                if (lang && lang.length > 0) lang = table[table.indexOf(lang) - 1];
                            }
                            
                        }
                    }
                };
                req.send(null);
            }
        }
        
        if (!lang) lang = 'no-highlight';
        chrome.extension.sendRequest({lang: lang});
        document.body.style.display = 'none';
        var list = document.querySelectorAll('style, link');
        for(var i = 0; i < list.length; ++i)
            list[i].parentNode.removeChild(list[i]);
        load('css/reset.css');
        load('css/main.css');
        load('css/' + prefs.theme + '.css');
        chrome.extension.sendRequest({inject: 'js/highlight.js'}, function(xhr){
            eval(xhr.responseText);
            chrome.extension.sendRequest({inject: 'js/languages/' + lang + '.js'}, function(xhr2){
                eval(xhr2.responseText);
                document.body.style.fontFamily = prefs.font;
                var code = document.querySelector('pre');
                var original = document.querySelector('#original');
                if (!original) {
                    original = document.createElement('div');
                    original.setAttribute('id', 'original');
                    original.style.display = 'none';
                    original.innerHTML = code.innerHTML;
                    document.body.appendChild(original);
                }
                code.innerHTML = original.innerHTML;
                (lang == 'javascript') && (code.textContent = js_beautify(code.textContent, {preserve_newlines: false}));
                code.innerHTML = '<code class="' + lang + '">' + code.innerHTML + '</code>';
                hljs.highlightBlock(code.firstChild, '    ', false);
                document.body.style.display = 'block';
                !isSighted && (document.body.className += 'sighted');
                
                var line_numbers = document.getElementById('line-numbers');
                !!line_numbers && line_numbers.parentNode.removeChild(line_numbers);
                var nlines = code.innerText.split(/\n/).length;
                line_numbers = document.createElement('ul');
                line_numbers.id = 'line-numbers';
                for(i = 1; i <= nlines; ++i) {
                    var li = document.createElement('li')
                    li.id = 'line-' + i;
                    li.innerText = i;
                    line_numbers.appendChild(li);
                }
                document.body.insertBefore(line_numbers, code);
                eval(prefs['show-line-numbers']) && (line_numbers.style.display = 'block');
                document.addEventListener("keyup", function(e) {
                    if (e.keyCode == 76) {
                        var line = prompt("Line number to jump to:", "");
                        var el = document.querySelector('#line-' + line);
                        el && el.scrollIntoViewIfNeeded();
                    }
                }, false);
            });
        });
    });
    
})();
