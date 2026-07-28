$(document).ready(function(){
    
   $('#player_delete').click(function(){
      if(confirm('Czy napewno chcesz usunąć ze statystyk tego meczu zaznaczonych zawodników?'))
      {
          var myOptions = {
                val1 : $('#team1 option:selected').val()
            };

            $('#team1 option:selected').remove();

            var myOptions2 = {
                val1 : $('#team2 option:selected').val()
            };

            $('#team2 option:selected').remove();
       }
   });

    $('#wonsets_A').change(function(){
        var val = $('#wonsets_A').val();
        if( val != '0' &&
            val != '1' &&
            val != '2' &&
            val != '3' &&
            val != '4' &&
            val != '5' &&
            val != '6' &&
            val != '7' &&
            val != '8' &&
            val != '9'
           )
           {
              $('#wonsets_A').val('0');
           }
    });

    $('#wonsets_A').change(function(){
        var val = $('#wonsets_A').val();
        if( val != '0' &&
            val != '1' &&
            val != '2' &&
            val != '3' &&
            val != '4' &&
            val != '5' &&
            val != '6' &&
            val != '7' &&
            val != '8' &&
            val != '9'
           )
           {
              $('#wonsets_A').val('0');
           }
    });

    $('#wonsets_B').change(function(){
        var val = $('#wonsets_B').val();
        if( val != '0' &&
            val != '1' &&
            val != '2' &&
            val != '3' &&
            val != '4' &&
            val != '5' &&
            val != '6' &&
            val != '7' &&
            val != '8' &&
            val != '9'
           )
           {
              $('#wonsets_B').val('0');
           }
    });

    $('#users').dblclick(function(){
        var myOptions = {
            val1 : $('#users option:selected').val()
        };
        $.each(myOptions, function(val, text) {
            $('#signedup_users').append(
                $('<option></option>').val($('#users option:selected').val()).html(text)
                );
        });
        $('#users option:selected').remove();

    });
    
    $('#submit_match').click(function(){
        $("#signedup_users").each(function(){
            $("#signedup_users option").attr("selected","selected");
        });
    });


    $('#signedup_users').dblclick(function(){
        var myOptions = {
            val1 : $('#signedup_users option:selected').val()
        };
        $.each(myOptions, function(val, text) {
            $('#users').append(
                $('<option></option>').val($('#signedup_users option:selected').val()).html(text)
                );
        });
        $('#signedup_users option:selected').remove();
    });

    $('#team1').dblclick(function(){
        var myOptions = {
            val1 : $('#team1 option:selected').val()
        };
        $.each(myOptions, function(val, text) {
            $('#team2').append(
                $('<option></option>').val($('#team1 option:selected').val()).html(text)
                );
        });
        $('#team1 option:selected').remove();

    });

    $('#submit_matchsummary').click(function(){
        $("#team1").each(function(){
           $("#team1 option").attr("selected","selected");
        });

        $("#team2").each(function(){
           $("#team2 option").attr("selected","selected");
        });
    });


   $('#team2').dblclick(function(){
        var myOptions = {
            val1 : $('#team2 option:selected').val()
        };
        $.each(myOptions, function(val, text) {
            $('#team1').append(
                $('<option></option>').val($('#team2 option:selected').val()).html(text)
                );
        });
        $('#team2 option:selected').remove();
    });

    $('#login_input input').click(function(){
        if($(this).val()=='Nazwa użytkownika'){
            $(this).val('');
        }
    });
    $('#fake').focus(function(){
        $(this).hide();
        $('#real').show();
        $('#real').select();
    });

    $('.select').change(function(){
        var day = $('#date_day option:selected').text();
        var month = $('#date_month option:selected').text();
        var year = $('#date_year option:selected').text();
        $.ajax({
            type: "POST",
            url: mainurl + "?module=match&action=checkdate",
            data: "day="+day+
            "&month="+month+
            "&year="+year,
            DataType: 'xml',
            beforeSend: function(){
                
            },
            success: function(xml){
                $('#submit_match').show();
                $(xml).find('item').each(function(){
                    if($(this).attr('key') == "checkresult"){
                        if($(this).attr('value')=='ok')
                        {
                            $('#date_error').hide();
                            $('#submit_match').show();
                        }
                        else
                        {
                            $('#date_error').show();
                            $('#submit_match').hide();
                        }
                    }
                });
            }
        });
    });
});
//---------------------------------------------------------------------
function incrementCounter(id) {
    advAJAX.get({
        url : "?module=match&action=inc_counter&id="+id
    });
}

function enable_star(id) {
    var broken_id = id.split("_");
    for (var i=1; i <= broken_id[1]; i++) {
        document.getElementById(broken_id[0]+'_'+i).className='gallery_star2';
    }
}
function disable_star(id) {
    var broken_id = id.split("_");
    for (var i=1; i <= broken_id[1]; i++) {
        if(document.getElementById(broken_id[0]).style.display=='block'){
        }else{
            document.getElementById(broken_id[0]+'_'+i).className='gallery_star';
        }
    }
}
function check(){
    return confirm('Potwierdź swoją ocenę klikając OK. Uwaga! Nie będzie można już zmienić tej oceny!');
}

function vote(id) {
    if(check()){
        advAJAX.get({
            url: "?module=match&action=vote&id="+id
        });
        var broken_id = id.split("_");
        for (var i=1; i <= 5; i++) {
            document.getElementById(broken_id[0]+'_'+i).className='gallery_star_unvisible';
        }
        document.getElementById(broken_id[0]).style.display='block';

        document.getElementById(broken_id[0]+'1').style.display='block';
        if(broken_id[1] < 2) {
            document.getElementById(broken_id[0]+'20').style.display='block';
        }else{
            document.getElementById(broken_id[0]+'2').style.display='block';
        }
        if(broken_id[1] < 3) {
            document.getElementById(broken_id[0]+'30').style.display='block';
        }else{
            document.getElementById(broken_id[0]+'3').style.display='block';
        }
        if(broken_id[1] < 4) {
            document.getElementById(broken_id[0]+'40').style.display='block';
        }else{
            document.getElementById(broken_id[0]+'4').style.display='block';
        }
        if(broken_id[1] < 5) {
            document.getElementById(broken_id[0]+'50').style.display='block';
        }else{
            document.getElementById(broken_id[0]+'5').style.display='block';
        }
    }
}
// komentarze
var url = "http://www.siatkowka.escobb.com.pl/";
function addComment_visible(id){
    document.getElementById('getcomment_window').style.display='none'
    var img_id = document.getElementById('img_id');
    img_id.setAttribute('value',id);

    document.getElementById('comment_window').style.display='block';
}
function closeComment(){
    document.getElementById('getcomment_window').style.display='none'
    document.getElementById('comment_window').style.display='none'
}
function closeGetComment(){
    document.getElementById('getcomment_window').style.display='none'
    document.getElementById('comment_window').style.display='none'
}
function init(){
    advAJAX.setDefaultParameters({
        onInitialization : function(obj) { },
        onLoading : function(obj) { },
        // onSuccess : function(obj) { showAlert(obj.tag,obj.responseText); },
        onError : function(obj) { }
    });
}
function saveComment(){
    if(document.getElementById('escom_desc').value == ''){
        alert('Komentarz nie moze byc pusty!');
    }else{
        advAJAX.post({
            url: url+"?module=comment&action=addcomment",
            parameters: {
                "esmat_id" : document.getElementById('img_id').getAttribute('value'),
                "escom_desc" : document.getElementById('escom_desc').value
            },
            onSuccess : function(obj) {
                alert("Twój komentarz został zapisany");
                document.getElementById('getcomment_window').style.display='none'
                document.getElementById('comment_window').style.display='none'
            },
            tag: document.getElementById('img_id').value,
            mimeType: 'text/plain'
        });
    }
}
function getComments(id, it, f, s){
    document.getElementById('comment_window').style.display='none'
    var splited_id = id.split("_");
        
    if(f == undefined){
        f = 0;
    }
    if(s == undefined){
        s = 0;
    }
    if(it == undefined){
        it = 1;
    }    
    advAJAX.get({
        url : "?module=comment&action=getCommentsAjax&id="+splited_id[1]+"&from="+f,
        onInitialization : function() {
            
        },
        onSuccess : function(obj) {
            var comments = obj.responseXML.getElementsByTagName('comments');
            var comment = obj.responseXML.getElementsByTagName('comment');
            var com_total = comment.length;

            var show_area = document.getElementById('getcomment_window');
            show_area.innerHTML='';
            show_area.className='above';
            show_area.style.display='block';

            var tbody = document.createElement('tbody');

            var c_button = document.createElement('div')
            c_button.className='closebutton';

            var c_button_txt = document.createTextNode('')
            c_button.onclick = function() {
                closeGetComment();
            }

            var tbl = document.createElement('table');
            var tr = document.createElement('tr');
            var td = document.createElement('td');
            var txt = document.createTextNode('TEXT');
            tbl.className='tbll';

            show_area.appendChild(c_button);
            c_button.appendChild(c_button_txt);
            show_area.appendChild(tbl);
            tbl.appendChild(tbody)
            if(comment[0]==undefined){
                var div = document.createElement('div');
                var nocomments = document.createTextNode('Nie skomentowano jeszcze tego meczu.');

                var row = document.createElement('tr');
                var col = document.createElement('td');
                tbody.appendChild(row);
                row.appendChild(col);

                col.appendChild(div);
                div.appendChild(nocomments);
            }else{
                for(var i=0; i<com_total; i++){
                    var row = document.createElement('tr');
                    var col = document.createElement('td');
                    var div = document.createElement('div');
                    var datadiv = document.createElement('div');
                    datadiv.className='escom_date';

                    var userdiv = document.createElement('div');
                    userdiv.className='escom_user';

                    var commentdiv = document.createElement('div');
                    commentdiv.className='escom_comment';

                    col.appendChild(userdiv);
                    col.appendChild(datadiv);
                    col.appendChild(commentdiv);

                    var createdate = document.createTextNode(comment[i].getAttribute('escom_createdate'));
                    datadiv.appendChild(createdate);
                    
                    var addedby = document.createTextNode(comment[i].getAttribute('escom_addedby'));
                    userdiv.appendChild(addedby);

                    div.className='vert_line';
                    div.style.marginTop='5px';

                    tbody.appendChild(row);
                    row.appendChild(col);

                    var desc = document.createTextNode(comment[i].getAttribute('escom_desc'));
                    commentdiv.appendChild(desc);
                    if(i < com_total - 1){
                        col.appendChild(div);
                    }
                }
            }
            //stronnicowanie
            var div = document.createElement('div');
            div.className='pages';
            show_area.appendChild(div);

            var from = obj.responseXML.getElementsByTagName('from');
            var step = obj.responseXML.getElementsByTagName('step');
            var iter = obj.responseXML.getElementsByTagName('iter');
            var active = obj.responseXML.getElementsByTagName('active');
            var nextfrom = obj.responseXML.getElementsByTagName('nextfrom');
            var prevfrom = obj.responseXML.getElementsByTagName('prevfrom');
            var from_length = from.length;

            for(var i=0; i<from_length; i++){
                if(i == 0)
                    if(prevfrom[0].getAttribute('value') != '') {
                        var link = document.createElement('a');
                        link.className="prevnext"
                        link.onclick = function() {
                            getComments(id, (it-1), f - parseInt(step[0].getAttribute('value')) ,step[0].getAttribute('value') )
                        }
                        div.appendChild(link);
                        var prevtxt = document.createTextNode('Poprzednia');
                        link.appendChild(prevtxt);
                    }
                //endprev
                //middle
                if(active[i].getAttribute('value') != '') {
                    var link = document.createElement('a');
                    link.className="activepagefalse"
                    div.appendChild(link);
                    var currentIt = iter[i].getAttribute('value')
                    var itertxt = document.createTextNode(currentIt);
                    link.appendChild(itertxt);
                }
                if(active[i].getAttribute('value') == '') {
                    var link = document.createElement('a');
                    link.className="activepagetrue"
                    link.setAttribute('id','it_'+i);
                    link.setAttribute('value', i+1);
                    link.onclick = function() {
                        getComments(id, this.getAttribute('value'), (this.getAttribute('value')-1) * parseInt(step[0].getAttribute('value')) ,step[0].getAttribute('value') )
                    }
                    div.appendChild(link);

                    var itertxt = document.createTextNode(i+1);
                    link.appendChild(itertxt);
                }
                //ENDmiddle
                //next
                if(i == from_length-1)
                    if(nextfrom[0].getAttribute('value') != '') {
                        var link = document.createElement('a');
                        link.className="prevnext"
                        link.onclick = function() {
                            getComments(id,it+1, f + parseInt(step[0].getAttribute('value')) ,step[0].getAttribute('value') )
                        }
                        div.appendChild(link);
                        var nexttxt = document.createTextNode('Następna');
                        link.appendChild(nexttxt);
                    }
            //endnext
            }
        },

        onError : function(obj) {
            alert("Error: " + obj.status);
        },
        onFinalization : function() {
        //document.getElementById('msg3').innerHTML='';
        }
    });
}