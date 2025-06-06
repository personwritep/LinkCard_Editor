// ==UserScript==
// @name        LinkCard Editor ⭐
// @namespace        http://tampermonkey.net/
// @version        5.7
// @description        通常表示でリンクカードを編集 「Ctrl+F6」
// @author        Ameba Blog User
// @match        https://blog.ameba.jp/ucs/entry/srventry*
// @exclude        https://blog.ameba.jp/ucs/entry/srventrylist.do*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=ameblo.jp
// @grant        none
// @updateURL        https://github.com/personwritep/LinkCard_Editor/raw/main/LinkCard_Editor.user.js
// @downloadURL        https://github.com/personwritep/LinkCard_Editor/raw/main/LinkCard_Editor.user.js
// ==/UserScript==


let mode=0; // ツールのON/OFF
let mode_e=0; // テキスト編集モード（enhance）
let mode_c=0; // サブコントロール

let retry=0;
let interval=setInterval(wait_target, 100);
function wait_target(){
    retry++;
    if(retry>10){
        clearInterval(interval); }
    let target=document.querySelector('#cke_1_contents');
    if(target){
        clearInterval(interval);
        main(); }}



function main(){
    let editor_iframe;
    let iframe_doc;
    let iframe_body;
    let selection;
    let range;

    let ua=0;
    let agent=window.navigator.userAgent.toLowerCase();
    if(agent.indexOf('firefox')!=-1){ ua=1; } // Firefoxの場合
    if(agent.indexOf('edg')!=-1){ ua=2; } // Edgeの場合


    let read_json=localStorage.getItem('LinkCard Style');
    let lcard_set=JSON.parse(read_json);
    if(!Array.isArray(lcard_set)){
        lcard_set=
            [0, 0, "white", 1, "#e2e2e2", 0, "#333", "red", "", "", 4, 0, 0]; }
    if(lcard_set.length<13){
        lcard_set[11]=0;
        lcard_set[12]=0; }

    let write_json=JSON.stringify(lcard_set);
    localStorage.setItem('LinkCard Style', write_json);


    let target0=document.querySelector('#cke_1_contents');
    let monitor0=new MutationObserver( catch_key );
    monitor0.observe(target0, {childList: true});

    catch_key();

    function catch_key(){
        editor_iframe=document.querySelector('.cke_wysiwyg_frame');
        if(editor_iframe){
            iframe_doc=editor_iframe.contentWindow.document;
            if(iframe_doc){

                when_back();

                iframe_doc.addEventListener('keydown', check_key);
                document.addEventListener('keydown', check_key);

                function check_key(event){
                    if(event.ctrlKey && event.keyCode==117){
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        if(mode==0 && editor_iframe){
                            mode=1;
                            sign();
                            card_edit(); }
                        else if(mode==1 && editor_iframe){
                            mode=0;
                            mode_e=0;
                            mode_c=0;
                            sign_clear();
                            card_close(); }}

                    if(event.keyCode==116){
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        alert(
                            "　⛔　F5 / Ctrl + F5 / Shift + F5　\n"+
                            "　　　　このショートカットは現在のページを遷移して、編集中の\n"+
                            "　　　　データを損失する可能性があるので、無効にしています。\n"+
                            "　　　　　　-----　LinkCard Editor　-----"); }}}}

        before_end();

    } // catch_key()



    function when_back(){
        if(mode==1){
            sign();
            card_close();
            mode_e=0;
            mode_c=0;
            card_edit(); }}



    function card_close(){
        iframe_body=iframe_doc.querySelector('body');
        if(iframe_body){
            selection=iframe_doc.getSelection();
            selection.removeAllRanges();

            let target_card=iframe_body.querySelectorAll('.ogpCard_root');
            for(let k=0; k<target_card.length; k++){
                if(target_card[k].classList.contains('edit_card')){
                    target_card[k].classList.remove('edit_card');
                    if(target_card[k].classList.contains('edit_card_e')){
                        target_card[k].classList.remove('edit_card_e');
                        edit_span_end(target_card[k]); }}}

            sens_help(0); }}



    function card_edit(){
        iframe_doc.onclick=function(event){
            let elem=iframe_doc.elementFromPoint(event.clientX, event.clientY);
            if(elem){
                let select_card=elem.closest('.ogpCard_root');
                if(select_card){
                    set_card(select_card, event); }}} // Card編集開始

        function set_card(card, event){
            event.preventDefault();
            event.stopImmediatePropagation();

            if(mode==1 && card.classList.contains('edit_card')){ // 対象カードでの操作
                if(mode_e==0 &&
                   area_match(card, event) && (event.ctrlKey || event.shiftKey)){ // 編集選択
                    mode_e=1;
                    sens_help(2);
                    mode_enhance(card, event); }
                else if(mode_e==1){
                    if(!area_match(card, event)){ // 編集終了
                        mode_e=0;
                        sens_help(1);
                        mode_no_enhance(card); }
                    else{
                        if(area_match(card, event).style.zIndex!='1'){
                            if(event.ctrlKey || event.shiftKey){ // 編集移動
                                edit_span_end(card);
                                selection.removeAllRanges();
                                mode_e=1;
                                sens_help(2);
                                mode_enhance(card, event); }
                            else { // 編集終了
                                mode_e=0;
                                sens_help(1);
                                mode_no_enhance(card); }}}}}

            else if(mode==1 &&
                    !card.classList.contains('edit_card') && event.ctrlKey){ // 対象カード移動
                mode_e=0;
                mode_c=1;
                card_close(); // 他のCardを閉じる
                card.classList.add('edit_card');
                sens_help(1);
                url_reset();
                edit_in(card); }}

    } // card_edit()



    function sens_help(n){
        let e_hint=document.querySelector('#disp_le .e_hint');
        if(e_hint){
            if(n==0){
                e_hint.innerHTML=''; }
            if(n==1){
                e_hint.innerHTML=
                    '　　テキスト編集：Ctrl+Click'; }
            if(n==2){
                e_hint.innerHTML=
                    '　　テキスト編集終了：Ctrl+Click　　テキストを全選択：Shift+Click'+
                    '　　　　　　　　　　　　　　'; }}}



    function area_match(card, event){ // カード上のクリック場所の判定
        let elem=iframe_doc.elementFromPoint(event.clientX, event.clientY);
        let select_parent;
        if(elem.textContent){
            if(elem.closest('.ogpCard_title')){
                select_parent=card.querySelector('.ogpCard_title'); }
            if(elem.closest('.ogpCard_description')){
                select_parent=card.querySelector('.ogpCard_description'); }
            if(elem.closest('.ogpCard_urlText')){
                select_parent=card.querySelector('.ogpCard_urlText'); }}
        return select_parent; }



    function mode_enhance(card, event){ // TEXT編集する
        let target=area_match(card, event);

        if(event.ctrlKey){
            edit_span(target, 0); } // 対象SPANを編集 💢
        else if(event.shiftKey){
            edit_span(target, 1); } // 対象SPANを選択 💢

        if(!card.classList.contains('edit_card_e')){
            card.classList.add('edit_card_e'); }

        let link=card.querySelector('.ogpCard_link');
        if(link){
            link.setAttribute('draggable', 'false'); }} // firefoxで必要



    function mode_no_enhance(card){
        if(card.classList.contains('edit_card_e')){
            card.classList.remove('edit_card_e'); }

        let link=card.querySelector('.ogpCard_link');
        if(link.hasAttribute('draggable')){
            link.removeAttribute('draggable'); } // firefoxで必要

        edit_span_end(card); // 編集不能に戻す
        selection.removeAllRanges(); }



    function edit_span(elem, n){
        elem.setAttribute('contenteditable', 'true');
        elem.style.zIndex='1';
        elem.style.outline='2px solid #2196f3';
        elem.style.outlineOffset='3px';

        elem.addEventListener('keydown', (e)=>{
            if(e.ctrlKey && e.keyCode=='86'){
                if(ua==1){
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    alert("カードテキストに貼付け操作はできません"); }
                else{
                    if(!e.shiftKey){
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        alert("「Ctrl+Shift+V」で貼付けてください"); }}}});

        if(n==1){
            selection=iframe_doc.getSelection();
            range=iframe_doc.createRange();
            range.selectNodeContents(elem);
            selection.removeAllRanges();
            selection.addRange(range); }}



    function edit_span_end(card){
        let spans=card.querySelectorAll('span');
        for(let k=0; k<spans.length; k++){
            if(spans[k].hasAttribute('contenteditable')){
                last_br(spans[k]);
                spans[k].removeAttribute('contenteditable');
                spans[k].style.zIndex='';
                spans[k].style.outline='';
                spans[k].style.outlineOffset=''; }}

        function last_br(elem){
            let elem_nodes=elem.childNodes;
            for(let k=elem_nodes.length-1; k>=0; k--){
                if(elem_nodes[k].nodeName=='BR'){
                    if(elem_nodes[k]==elem.lastChild){
                        elem_nodes[k].remove(); }}
                else if(elem_nodes[k].nodeName!='#text'){
                    if(elem_nodes[k].nodeName!='SPAN' &&
                       elem_nodes[k].nodeName!='IMG'){
                        elem_nodes[k].outerHTML=elem_nodes[k].textContent; }}}}}



    function edit_in(card){
        if(mode==1){
            if(!card.style.textAlign){
                card.style.textAlign='center'; } // デフォルトで中央配置

            let title=card.querySelector('.ogpCard_title');
            let description=card.querySelector('.ogpCard_description');
            if(title && !description){
                let descrip=
                    '<span class="ogpCard_description" style="overflow: hidden; '+
                    'margin: 1px 0 0; font: 13px/1.4 Meiryo; text-align: left;">　'+
                    '</span>';
                title.insertAdjacentHTML('afterend', descrip); } // 本文引用が無い場合に補填

            let link=card.querySelector('.ogpCard_link');
            let imageWrap=card.querySelector('.ogpCard_imageWrap');
            if(!imageWrap){
                let imgw=
                    '<span class="ogpCard_imageWrap" '+
                    'style="position:relative; width: 116px; height: 116px; flex-shrink:0; '+
                    'border: 1px solid #eee; overflow: hidden;"></span>';
                link.insertAdjacentHTML('beforeend', imgw); } // カバー画像が無い場合にエリア確保

            slim_title(card);
            slim_icon(card);

            item_setter(card);
            align_in(card);
            size_in(card);
            bg_color(card);
            tx_color(card);
            set_url(card);
            bd_color(card);
            bd_width(card);
            bd_radius(card);
            svg_icon(card);
            mem_plus(card);
            mem_paste(card);
            moz(card);

        }} // edit_in()



    function slim_title(card){ // 先頭・末尾の『』を削除
        if(card.classList.contains('edit_card')){
            let link=card.querySelector('.ogpCard_link');
            if(link.getAttribute('href').includes('https://ameblo.jp/')){
                let title=card.querySelector('.ogpCard_title');
                if(title){
                    let title_str=title.innerHTML;
                    if(title_str.slice(0, 1)=='『' && title_str.slice(-1)=='』'){
                        title_str=title_str.slice(1).slice(0, -1); }
                    title.innerHTML=title_str; }}}}



    function slim_icon(card){ // リンクマークをテキスト化
        let url=card.querySelector('.ogpCard_url');
        if(url){
            url.style.margin='auto 0 0 20px'; }
        let iconWrap=card.querySelector('.ogpCard_iconWrap');
        if(iconWrap){
            if(iconWrap.style.fill && iconWrap.style.fill !='currentcolor'){
                iconWrap.style.color=iconWrap.style.fill; }
            if(iconWrap.style.fill){
                iconWrap.style.fill=''; }
            if(card.querySelector('.ogpCard_icon') || card.querySelector('svg')){
                iconWrap.innerHTML='∽';
                iconWrap.style.position='';
                iconWrap.style.width='16px';
                iconWrap.style.height='14px';
                iconWrap.style.flexShrink='';
                iconWrap.style.font='bold 14px/17px Meiryo';
                iconWrap.style.transform='rotate(135deg)'; }}
        let urlText=card.querySelector('.ogpCard_urlText');
        if(urlText){
            urlText.style.fontSize='13px'; }}



    function item_setter(card){
        let target_i=document.querySelector('#js-photos-imageList');
        let monitor_i=new MutationObserver(item_select);
        monitor_i.observe(target_i, {childList: true, subtree: true}); // 画像パレット監視

        item_select();

        function item_select(){
            let item=document.querySelectorAll('.p-images-imageList__item');
            for(let k=0; k<item.length; k++){
                item[k].addEventListener('click', function(event){
                    set_img(event, item[k]); }); }}

        function set_img(e, item){
            if(mode==1){
                e.stopImmediatePropagation();
                let img_src=item.getAttribute('data-image');
                let inner=
                    '<img alt="" class="ogpCard_image" data-ogp-card-image="" '+
                    'height="120" loading="lazy" data-cke-saved-src="' + img_src +
                    '" src="' + img_src +
                    '" style="position:absolute;top:50%;left:50%;object-fit:cover;'+
                    'min-height:100%;min-width:100%;'+
                    'transform:translate(-50%,-50%)" width="120">';

                editor_iframe=document.querySelector('.cke_wysiwyg_frame');
                if(editor_iframe){
                    let target_card=iframe_body.querySelectorAll('.ogpCard_root');
                    for(let k=0; k<target_card.length; k++){
                        if(target_card[k].classList.contains('edit_card')){
                            range_con(target_card[k]);
                            let card_imgw=
                                target_card[k].querySelector('.ogpCard_imageWrap');
                            if(card_imgw){
                                card_imgw.innerHTML=inner; }}}

                    function range_con(card){
                        if(mode==1){
                            selection=iframe_doc.getSelection();
                            range=iframe_doc.createRange();
                            range.setStart(card, 0);
                            range.setEnd(card, 0);
                            selection.removeAllRanges();
                            selection.addRange(range); }}

                }}} // set_img()


        item_sign(card);

        function item_sign(card){
            let photos_w=document.querySelector('#js-photos-wrapper');
            photos_w.addEventListener('mouseover', function(){
                let imageWrap=card.querySelector('.ogpCard_imageWrap');
                if(imageWrap && card.classList.contains('edit_card')){
                    imageWrap.style.filter='invert(1)';
                    imageWrap.style.background='#442814'; }});

            photos_w.addEventListener('mouseout', function(){
                let imageWrap=card.querySelector('.ogpCard_imageWrap');
                if(imageWrap && card.classList.contains('edit_card')){
                    imageWrap.style.filter='';
                    imageWrap.style.background=''; }}); }

    } // item_setter()



    function align_in(card){
        let al=document.querySelector('#disp_le .al');
        let ac=document.querySelector('#disp_le .ac');
        let ar=document.querySelector('#disp_le .ar');
        al.onclick=function(){
            if(card.style.textAlign!='left'){
                if(card.classList.contains('edit_card')){
                    card.style.textAlign='left'; }}}
        ac.onclick=function(){
            if(card.classList.contains('edit_card')){
                if(card.style.textAlign!='center'){
                    card.style.textAlign='center'; }}}
        ar.onclick=function(){
            if(card.classList.contains('edit_card')){
                if(card.style.textAlign!='right'){
                    card.style.textAlign='right'; }}}

    } // arrange_in()



    function size_in(card){
        let lz=document.querySelector('#disp_le .lz');
        lz.onclick=function(event){
            let link=card.querySelector('.ogpCard_link');
            if(card.classList.contains('edit_card')){
                if(event.ctrlKey){
                    ex_compact(card); }
                else{
                    if(mode_e==1){
                        mode_e=0;
                        mode_no_enhance(card); }
                    else{
                        if(link){
                            if(link.style.height=='108px'){
                                arrange_min(card); }
                            else if(link.style.height=='auto'){
                                arrange_default(card); }
                            else{ // 未アレンジは compactに変更
                                arrange_compact(card); }}}}}}

    } // size_in()



    function ex_compact(card){
        let ok=confirm(
            "　　　💢 リンクカードの小型最軽量化オプション\n\n"+
            "　　「OK」 を押すと 「カバー画像」「記事の本文部」 を削除します。\n"+
            "　　 軽量化を元に戻すには、カードを最初から作り直してください。");

        if(ok){
            if(card.classList.contains('edit_card')){
                arrange_ex_compact(card); }
            mode_e=0; // テキスト編集モードのリセット
            mode_no_enhance(card); }
        else{ ; }} // ex_compact()



    function arrange_ex_compact(card){
        let link=card.querySelector('.ogpCard_link');
        if(link){
            link.style.width='500px';
            link.style.height='';
            link.style.margin='';
            link.style.boxSizing=''; }
        let content=card.querySelector('.ogpCard_content');
        if(content){
            content.style.padding='7px 15px 4px 15px';
            content.style.flexDirection='';
            content.style.overflow='';
            content.style.justifyContent='inherit'; }
        let title=card.querySelector('.ogpCard_title');
        if(title){
            title.style.WebkitBoxOrient='';
            title.style.display='';
            title.style.WebkitLineClamp='';
            title.style.maxHeight='19px';
            title.style.flexShrink='';
            title.style.font='bold 16px/1.25 Meiryo'; }
        let description=card.querySelector('.ogpCard_description');
        if(description){
            description.remove(); }
        let url=card.querySelector('.ogpCard_url');
        if(url){
            url.style.margin=''; }
        let urlText=card.querySelector('.ogpCard_urlText');
        if(urlText){
            urlText.style.overflow='';
            urlText.style.textOverflow='';
            urlText.style.textAlign=''; }
        let imageWrap=card.querySelector('.ogpCard_imageWrap');
        if(imageWrap){
            imageWrap.remove(); }


        let ogpCard_wrap=card.querySelector('.ogpCard_wrap');
        if(ogpCard_wrap){
            ogpCard_wrap.removeAttribute('contenteditable'); }

        if(link){
            link.removeAttribute('data-ogp-card-log');
            link.removeAttribute('data-cke-saved-href');

            let fake=document.createElement("img");
            if(!link.querySelector('img')){
                link.appendChild(fake); }}

        let all_obj=card.querySelectorAll('*');
        for(let k=0; k<all_obj.length; k++){
            all_obj[k].classList.remove(
                'ogpCard_wrap', 'ogpCard_content', 'ogpCard_title',
                'ogpCard_url', 'ogpCard_iconWrap', 'ogpCard_urlText'); }
        card.classList.remove('ogpCard_root', 'edit_card');

        let dupe=card.cloneNode(true);
        card.parentNode.replaceChild(dupe, card); }



    function arrange_compact(card){
        let link=card.querySelector('.ogpCard_link');
        if(link){
            link.style.width='500px';
            link.style.height='108px';
            link.style.margin='0 auto';
            link.style.boxSizing=''; }
        let content=card.querySelector('.ogpCard_content');
        if(content){
            content.style.padding='8px 25px 4px 15px';
            content.style.flexDirection='column';
            content.style.justifyContent='inherit'; }
        let title=card.querySelector('.ogpCard_title');
        if(title){
            title.style.maxHeight='39px';
            title.style.flexShrink='0';
            title.style.font='bold 16px/1.25 Meiryo';
            title.style.WebkitLineClamp='2'; }
        let description=card.querySelector('.ogpCard_description');
        if(description){
            description.style.whiteSpace='';
            description.style.textOverflow='';
            description.style.margin='0';
            description.style.font='13px/1.4 Meiryo';
            description.style.display=''; }
        let url=card.querySelector('.ogpCard_url');
        if(url){
            url.style.margin='auto 0 0 20px'; }
        let imageWrap=card.querySelector('.ogpCard_imageWrap');
        if(imageWrap){
            imageWrap.style.width='98px';
            imageWrap.style.height='98px';
            imageWrap.style.margin='auto 0';
            imageWrap.style.top='';
            imageWrap.style.right='15px';
            imageWrap.style.border='1px solid #eee';
            imageWrap.style.overflow='hidden';
            imageWrap.style.display=''; }}



    function arrange_min(card){
        let link=card.querySelector('.ogpCard_link');
        if(link){
            link.style.width='500px';
            link.style.height='auto';
            link.style.margin='0 auto';
            link.style.boxSizing=''; }
        let content=card.querySelector('.ogpCard_content');
        if(content){
            content.style.padding='7px 15px 4px 15px';
            content.style.flexDirection='row';
            content.style.justifyContent='inherit'; }
        let title=card.querySelector('.ogpCard_title');
        if(title){
            title.style.maxHeight='19px';
            title.style.flexShrink='1';
            title.style.font='bold 16px/1.25 Meiryo';
            title.style.WebkitLineClamp='1'; }
        let description=card.querySelector('.ogpCard_description');
        if(description){
            description.style.whiteSpace='';
            description.style.textOverflow='';
            description.style.margin='0';
            description.style.font='13px/1.4 Meiryo';
            description.style.display='none'; }
        let url=card.querySelector('.ogpCard_url');
        if(url){
            url.style.margin='0'; }
        let imageWrap=card.querySelector('.ogpCard_imageWrap');
        if(imageWrap){
            imageWrap.style.width='';
            imageWrap.style.height='';
            imageWrap.style.margin='';
            imageWrap.style.top='';
            imageWrap.style.right='';
            imageWrap.style.border='';
            imageWrap.style.overflow='';
            imageWrap.style.display='none'; }}



    function arrange_default(card){
        let link=card.querySelector('.ogpCard_link');
        if(link){
            link.style.width='620px';
            link.style.height='120px';
            link.style.margin='';
            link.style.boxSizing='border-box'; }
        let content=card.querySelector('.ogpCard_content');
        if(content){
            content.style.padding='12px 16px 8px';
            content.style.flexDirection='column';
            content.style.justifyContent='inherit';
            content.style.backgroundColor=''; }
        let title=card.querySelector('.ogpCard_title');
        if(title){
            title.style.maxHeight='44px';
            title.style.flexShrink='0';
            title.style.font='bold 16px/1.25 Meiryo';
            title.style.WebkitLineClamp='2'; }
        let description=card.querySelector('.ogpCard_description');
        if(description){
            description.style.whiteSpace='';
            description.style.textOverflow='';
            description.style.marginTop='1px';
            description.style.font='13px/1.4 Meiryo';
            description.style.display=''; }
        let url=card.querySelector('.ogpCard_url');
        if(url){
            url.style.margin='auto 0 0 20px'; }
        let imageWrap=card.querySelector('.ogpCard_imageWrap');
        if(imageWrap){
            imageWrap.style.width='120px';
            imageWrap.style.height='120px';
            imageWrap.style.margin='';
            imageWrap.style.top='';
            imageWrap.style.right='';
            imageWrap.style.border='';
            imageWrap.style.overflow='hidden';
            imageWrap.style.display=''; }}



    function bg_color(card){
        let set_color;
        let lc_color=document.querySelector('#lc_color');
        let lc_trance=document.querySelector('#lc_trance');
        let link=card.querySelector('.ogpCard_link');
        let link_bgc=link.style.backgroundColor;
        if(link_bgc){
            lc_color.style.backgroundColor=link_bgc;
            lc_trance.value=rgba_trance(link_bgc);
            set_color=link_bgc; }

        import_color(card, lc_color, link, 'bg');

        let target_elem=lc_color;
        let monitor_elem=new MutationObserver(import_c);
        monitor_elem.observe(target_elem, {attributes: true});
        function import_c(){
            if(target_elem.style.opacity==2){
                monitor_elem.disconnect();
                setTimeout(()=>{
                    lc_trance.value=1;
                    set_color=lc_color.style.backgroundColor;
                    target_elem.style.opacity=1;
                }, 40);
                monitor_elem.observe(target_elem, {attributes: true}); }}


        lc_trance.addEventListener('input', function(event){
            event.preventDefault();
            let set_color_tmp=rgba(set_color, lc_trance.value);
            let lc_color=document.querySelector('#lc_color');
            lc_color.style.backgroundColor=set_color_tmp;
            let link=card.querySelector('.ogpCard_link');
            if(card.classList.contains('edit_card')){
                link.style.backgroundColor=set_color_tmp; }});


        function rgba(c_val, alpha){ // 透過色の白背景時の非透過色に変換
            let R, G, B;
            let c_val_arr=c_val.split(',');
            if(c_val_arr.length==3){
                R=c_val_arr[0].replace(/[^0-9]/g, '');
                G=c_val_arr[1].replace(/[^0-9]/g, '');
                B=c_val_arr[2].replace(/[^0-9]/g, '');
                return 'rgb('+cpColor(R, alpha)+', '+cpColor(G, alpha)+', '+cpColor(B, alpha)+')'

                function cpColor(deci_code, alp){
                    const colorCode=deci_code*alp + 255*(1 - alp);
                    return Math.floor(colorCode).toString(10); }}
            else{
                return c_val; }}

    } // bg_color()



    function import_color(card, sw, target, type){
        let color_label;
        let icon_button;

        editor_iframe=document.querySelector('.cke_wysiwyg_frame');
        iframe_doc=editor_iframe.contentWindow.document;
        selection=iframe_doc.getSelection();

        if(ua==0 || ua==2){
            color_label=document.querySelector('#cke_16_label');
            icon_button=document.querySelector('#cke_17'); }
        else if(ua==1){
            color_label=document.querySelector('#cke_15_label');
            icon_button=document.querySelector('#cke_16'); }

        let target_p=color_label;
        let monitor_p=new MutationObserver(get_copy);

        sw.onclick=function(event){
            if(card.classList.contains('edit_card')){
                selection.removeAllRanges(); // 記事中の選択に誤指定を防止
                icon_button.click();
                monitor_p.observe(target_p, {attributes: true}); }}


        function get_copy(){
            if(card.classList.contains('edit_card')){
                if(type=='bg'){
                    sw.style.backgroundColor=color_label.style.backgroundColor;
                    target.style.backgroundColor=sw.style.backgroundColor;
                    sw.style.opacity=2; }
                if(type=='cl'){
                    sw.style.backgroundColor=color_label.style.backgroundColor;
                    target.style.color=sw.style.backgroundColor;
                    let iconWrap=card.querySelector('.ogpCard_iconWrap');
                    if(iconWrap){
                        iconWrap.style.color=''; }
                    let svg=document.querySelector('#link_mark');
                    if(svg){
                        svg.style.color=sw.style.backgroundColor; }}
                if(type=='bd'){
                    sw.style.backgroundColor=color_label.style.backgroundColor;
                    target.style.borderColor=sw.style.backgroundColor; }
                if(type=='svg'){
                    sw.style.color=color_label.style.backgroundColor;
                    target.style.color=sw.style.color; }}
            monitor_p.disconnect(); }


        document.addEventListener('mousedown', function(){
            monitor_p.disconnect(); });


        if(document.querySelector('.cke_wysiwyg_frame')!=null){
            editor_iframe=document.querySelector('.cke_wysiwyg_frame');
            if(editor_iframe){
                iframe_doc=editor_iframe.contentWindow.document;
                if(iframe_doc){
                    iframe_doc.addEventListener('mousedown', function(){
                        monitor_p.disconnect(); }); }}}


        let target_body=document.querySelector('.l-body');
        let monitor_generator=new MutationObserver(stealth);
        monitor_generator.observe(target_body, {childList: true, subtree: true});

        function stealth(){
            let color_generator=document.querySelector('.ck-l-colorGenerator');
            if(color_generator){
                color_generator.addEventListener('mousedown', function(event){
                    event.stopImmediatePropagation(); }); }}

    } // import_color()



    function rgba_trance(color_val){
        let trance_val;
        let c_val_arr=color_val.split(',');
        if(c_val_arr.length!=4){
            trance_val=1; }
        else{
            trance_val=c_val_arr[3].replace(/[^0-9]/g, '')/10; }
        return trance_val; }



    function bg_reset(){
        let lc_color=document.querySelector('#lc_color');
        let lc_trance=document.querySelector('#lc_trance');
        lc_color.style.background='#fff';
        lc_trance.value=1; }



    function tx_color(card){ // Cardの基本文字色指定
        let link=card.querySelector('.ogpCard_link');
        if(link.style.color==''){ // 配色がある場合は訂正しない
            link.style.color='rgb(51, 51, 51)'; } // Cardの基本文字色を指定
        let title=card.querySelector('.ogpCard_title');
        if(title){
            title.style.color=''; }
        let description=card.querySelector('.ogpCard_description');
        if(description){
            description.style.color=''; }
        let urlText=card.querySelector('.ogpCard_urlText');
        if(urlText){
            urlText.style.color=''; }

        let tc_color=document.querySelector('#tc_color');
        tc_color.style.background=link.style.color;

        import_color(card, tc_color, link, 'cl');

    } // tx_color()



    function tx_reset(){
        let tc_color=document.querySelector('#tc_color');
        tc_color.style.background='#fff'; }



    function set_url(card){
        let url_wide=document.querySelector('#url_wide');
        let url_input=document.querySelector('#url_input');
        let url_clear=document.querySelector('#ex_disp .url_clear');
        let lw_h=document.querySelector('#lw_h');
        let write_url=document.querySelector('#write_url');

        let urlText=card.querySelector('.ogpCard_urlText');
        let link=card.querySelector('.ogpCard_link');
        let def_url=link.getAttribute('href');


        url_input.onclick=function(){
            if(mode_c==1){
                if(!url_input.classList.contains('url_input_w')){
                    url_input.classList.add('url_input_w');
                    lw_h.classList.remove('lw_hint');
                    lw_h.classList.add('lw_hint_w');
                    url_wide.style.display='block'; }}}


        url_wide.onclick=function(event){
            event.stopImmediatePropagation();
            if(mode_c==1){
                if(url_input.classList.contains('url_input_w')){
                    url_input.classList.remove('url_input_w');
                    lw_h.classList.remove('lw_hint_w');
                    lw_h.classList.add('lw_hint');
                    url_wide.style.display='none'; }}}


        url_input.value=def_url;
        url_clear.onclick=function(event){
            event.stopImmediatePropagation();
            url_input.value=''; }


        write_url.onclick=function(event){
            event.stopImmediatePropagation();
            event.preventDefault();
            rewrite(); }


        url_input.onkeydown=function(event){
            if(event.keyCode==13){
                event.stopImmediatePropagation();
                event.preventDefault();
                rewrite(); }}


        function rewrite(){
            def_url=link.getAttribute('href');
            if(url_input.value!='' && url_input.value!=def_url){ // 変更ある場合のみ実行
                let ok=confirm(
                    "　　　💢 リンクカードのURL書換えオプション\n\n"+
                    "　　現在の「URL入力枠」の内容をリンクURLに設定します。\n"+
                    "　　➔ カードを右クリックしてリンクを新しいウインドウに開く\n"+
                    "　　ことで、カードに設定されたリンクURLを確認出来ます。");

                if(ok){
                    if(card.classList.contains('edit_card')){
                        link.setAttribute('href', url_input.value);
                        let data_cke_saved_href=
                            link.getAttribute('data-cke-saved-href');
                        if(data_cke_saved_href){
                            link.setAttribute('data-cke-saved-href', url_input.value); }

                        url_input.style.background='#80deea';
                        setTimeout(()=>{
                            url_input.style.background='';
                        }, 500); }
                    set_icon(card);
                    urlText.textContent=get_domain(card); }
                else{
                    url_input.style.background='#80deea';
                    url_input.value='現在のリンクURLに戻します';
                    setTimeout(()=>{
                        url_input.style.background='';
                        url_input.value=def_url; // URL入力枠内容を元に戻す
                    }, 2000); }}
            else{
                url_input.value=def_url;
                if(url_input.classList.contains('url_input_w')){
                    url_input.classList.remove('url_input_w');
                    lw_h.classList.remove('lw_hint_w');
                    lw_h.classList.add('lw_hint');
                    url_wide.style.display='none'; }}}


        function set_icon(card){
            let iconWrap=card.querySelector('.ogpCard_iconWrap');
            if(iconWrap){
                if(iconWrap.style.width=='16px'){
                    card_icon(card, 0); }
                else{
                    card_icon(card, 1); }}}


        function get_domain(card){
            link=card.querySelector('.ogpCard_link');
            let card_url=link.getAttribute('href');
            let domain=card_url.match(/^https?:\/{2,}(.*?)(?:\/|\?|#|$)/)[1];
            return domain; }

    } // set_url()



    function bd_color(card){
        let lb_color=document.querySelector('#lb_color');
        let link=card.querySelector('.ogpCard_link');
        let link_bc=link.style.borderColor;
        if(link_bc){
            lb_color.style.background=link_bc; }

        import_color(card, lb_color, link, 'bd');

    } // bd_color()



    function bd_width(card){
        let link=card.querySelector('.ogpCard_link');
        let lborder=document.querySelector('#lborder');
        let link_bw=parseInt(link.style.borderWidth);
        let lb_disp=document.querySelector('#lb_disp');
        if(link_bw || link_bw==0){
            lborder.value=link_bw; }
        if(mode_c==1){
            lb_disp.textContent=lborder.value+'px'; }

        lborder.onchange=function(){
            if(card.classList.contains('edit_card')){
                link.style.borderWidth=lborder.value+'px';
                lb_disp.textContent=lborder.value+'px'; }}}



    function bd_radius(card){
        let link=card.querySelector('.ogpCard_link');
        let lbr=document.querySelector('#lbr');
        let link_br=parseInt(link.style.borderRadius);
        let lbr_disp=document.querySelector('#lbr_disp');
        if(link_br || link_br==0){
            lbr.value=link_br; }
        if(mode_c==1){
            lbr_disp.textContent='R'+lbr.value; }

        lbr.onchange=function(){
            if(card.classList.contains('edit_card')){
                link.style.borderRadius=lbr.value+'px';
                lbr_disp.textContent='R'+lbr.value; }}}



    function bd_reset(){
        let lb_color=document.querySelector('#lb_color');
        lb_color.style.background='#fff';
        let lb_disp=document.querySelector('#lb_disp');
        lb_disp.textContent='　';
        let lbr_disp=document.querySelector('#lbr_disp');
        lbr_disp.textContent='　'; }



    function svg_icon(card){
        let svg=document.querySelector('#link_mark');
        let iconWrap=card.querySelector('.ogpCard_iconWrap');
        let svg_c=iconWrap.style.fill;
        if(!svg_c || svg_c=='currentcolor'){
            svg.style.color=window.getComputedStyle(iconWrap).color; }
        else{ svg.style.color=svg_c; }

        import_color(card, svg, iconWrap, 'svg');

    } // link_icon()



    function sv_reset(){
        let svg=document.querySelector('#link_mark');
        if(svg){
            svg.style.color='#fff'; }}



    function mem_plus(card){
        let memo_plus=document.querySelector('#memo_plus');
        if(memo_plus){
            memo_plus.onclick=function(){
                let ok=confirm(
                    "　　 🟠 現在のリンクカードのデザインを登録します\n"+
                    "　　　　これまでの登録を上書きして良いですか？\n");

                if(ok){
                    if(card.classList.contains('edit_card')){
                        let link=card.querySelector('.ogpCard_link');
                        if(link){
                            if(link.style.height=='108px'){
                                lcard_set[0]=1; } // compact
                            else if(link.style.height=='auto'){
                                lcard_set[0]=2; } // min
                            else{
                                lcard_set[0]=0; } // 未アレンジ

                            if(card.style.textAlign=='left'){
                                lcard_set[1]=1; }
                            else if(card.style.textAlign=='center'){
                                lcard_set[1]=2; }
                            else if(card.style.textAlign=='right'){
                                lcard_set[1]=3; }
                            else{
                                lcard_set[1]=0; }

                            let link_bgc=link.style.backgroundColor;
                            if(link_bgc){
                                lcard_set[2]=link_bgc; }

                            let link_bw=parseInt(link.style.borderWidth);
                            if(link_bw || link_bw==0){
                                lcard_set[3]=link_bw; }

                            let link_bc=link.style.borderColor;
                            if(link_bc){
                                lcard_set[4]=link_bc; }

                            let imageWrap=card.querySelector('.ogpCard_imageWrap');
                            if(!imageWrap){
                                lcard_set[5]=1; }
                            else{
                                lcard_set[5]=0; }

                            let link_tc=link.style.color;
                            if(link_tc){
                                lcard_set[6]=link_tc; }

                            let svg_col=document.querySelector('#link_mark').style.color;
                            if(svg_col){
                                lcard_set[7]=svg_col; }

                            let urlText=card.querySelector('.ogpCard_urlText');
                            if(urlText){
                                lcard_set[8]=urlText.style.fontWeight;
                                lcard_set[9]=urlText.style.color; }

                            let link_br=parseInt(link.style.borderRadius);
                            if(link_br || link_br==0){
                                lcard_set[10]=link_br; }

                            let iconWrap_img=card.querySelector('.ogpCard_iconWrap img');
                            if(iconWrap_img){
                                lcard_set[12]=1; }
                            else{
                                lcard_set[12]=0; }

                            let write_json=JSON.stringify(lcard_set);
                            localStorage.setItem('LinkCard Style', write_json); // ストレージ保存
                        }}}}

        }} // mem_plus()



    function mem_paste(card){
        let memo_paste=document.querySelector('#memo_paste');
        if(memo_paste){
            memo_paste.onclick=function(event){
                if(event.shiftKey){ //「ドメイン表示部」に「強調デザイン」適用
                    if(card.classList.contains('edit_card')){
                        let iconWrap=card.querySelector('.ogpCard_iconWrap');
                        let urlText=card.querySelector('.ogpCard_urlText');
                        let svg=document.querySelector('#link_mark');
                        if(iconWrap && urlText && svg){
                            if(urlText.style.fontWeight==''){
                                iconWrap.style.color='red';
                                urlText.style.color='#222';
                                urlText.style.fontWeight='bold';
                                svg.style.color='red'; }
                            else{
                                iconWrap.style.color='';
                                urlText.style.color='';
                                urlText.style.fontWeight='';
                                svg.style.color=window.getComputedStyle(iconWrap).color; }}}}


                else if(event.ctrlKey){ //「リンクアイコン」⇄「ファビコン」の変更
                    if(card.classList.contains('edit_card')){
                        let iconWrap_img=card.querySelector('.ogpCard_iconWrap img');
                        if(iconWrap_img){
                            card_icon(card, 0); }
                        else{
                            card_icon(card, 1); }}}


                else{ // カード全体に「登録デザイン」適用
                    if(card.classList.contains('edit_card')){
                        if(lcard_set[0]==1){
                            arrange_compact(card); }
                        else if(lcard_set[0]==2){
                            arrange_min(card); }
                        else{
                            arrange_default(card); }

                        if(lcard_set[1]==1){
                            if(card.style.textAlign!='left'){
                                card.style.textAlign='left'; }}
                        else if(lcard_set[1]==2){
                            if(card.style.textAlign!='center'){
                                card.style.textAlign='center'; }}
                        else if(lcard_set[1]==3){
                            if(card.style.textAlign!='right'){
                                card.style.textAlign='right'; }}
                        else{
                            if(card.style.textAlign!='left'){
                                card.style.textAlign='left'; }}

                        let link=card.querySelector('.ogpCard_link');
                        if(link){
                            link.style.backgroundColor=lcard_set[2];
                            let lc_color=document.querySelector('#lc_color');
                            lc_color.style.background=lcard_set[2];
                            let lc_trance=document.querySelector('#lc_trance');
                            lc_trance.value=rgba_trance(lcard_set[2]);

                            link.style.borderWidth=lcard_set[3]+'px';
                            let lborder=document.querySelector('#lborder');
                            lborder.value=lcard_set[3];
                            let lb_disp=document.querySelector('#lb_disp');
                            lb_disp.textContent=lborder.value+'px';

                            link.style.borderColor=lcard_set[4];
                            let lb_color=document.querySelector('#lb_color');
                            lb_color.style.background=lcard_set[4];

                            link.style.color=lcard_set[6];
                            let tc_color=document.querySelector('#tc_color');
                            tc_color.style.background=lcard_set[6];

                            link.style.borderRadius=lcard_set[10]+'px';
                            let lbr=document.querySelector('#lbr');
                            lbr.value=lcard_set[10];
                            let lbr_disp=document.querySelector('#lbr_disp');
                            lbr_disp.textContent='R'+lbr.value; }

                        let iconWrap=card.querySelector('.ogpCard_iconWrap');
                        if(iconWrap){
                            iconWrap.style.color=lcard_set[7]; }
                        let svg=document.querySelector('#link_mark');
                        if(svg){
                            svg.style.color=lcard_set[7]; }

                        let urlText=card.querySelector('.ogpCard_urlText');
                        if(urlText){
                            urlText.style.fontWeight=lcard_set[8];
                            urlText.style.color=lcard_set[9]; }

                        if(lcard_set[5]==1){
                            arrange_ex_compact(card); }

                        card_icon(card, lcard_set[12]);


                        mode_e=0; // テキスト編集モードの場合はリセット
                        sens_help(1);
                        mode_no_enhance(card);
                        bg_color(card); }}

            }}} // mem_paste()



    function card_icon(card, n){
        let iconWrap=card.querySelector('.ogpCard_iconWrap');
        if(n==0){
            if(iconWrap){
                iconWrap.innerHTML='∽';
                iconWrap.style.position='';
                iconWrap.style.fill='';
                iconWrap.style.width='16px';
                iconWrap.style.height='14px';
                iconWrap.style.flexShrink='';
                iconWrap.style.font='bold 14px/17px Meiryo';
                iconWrap.style.transform='rotate(135deg)'; }}
        if(n==1){
            let link_url=card.querySelector('.ogpCard_link').getAttribute('href');
            if(link_url){
                let favicon_img=
                    '<img alt="" src="https://t1.gstatic.com/faviconV2?client=SOCIAL'+
                    '&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url='+ link_url +'&size=16" '+
                    'style="vertical-align: -3px; margin-right: 2px; min-width: 16px;">';
                iconWrap.innerHTML=favicon_img;
                iconWrap.style.position='';
                iconWrap.style.fill='';
                iconWrap.style.width='';
                iconWrap.style.height='';
                iconWrap.style.flexShrink='';
                iconWrap.style.font='bold 14px/17px Meiryo';
                iconWrap.style.transform=''; }}
    } // card_icon()



    function moz(card){
        let wrap=card.querySelector('.ogpCard_wrap');
        let monitor_br=new MutationObserver(no_br);
        monitor_br.observe(wrap, {childList: true, subtree: true});

        no_br();

        function no_br(){
            let br_moz=wrap.querySelector('br[type="_moz"]');
            if(br_moz){
                br_moz.remove(); }
            let br_crm=wrap.querySelector('.ogpCard_content > br');
            if(br_crm){
                br_crm.remove(); }}}



    function sign(){
        monitor0.disconnect();

        let help_url='https://ameblo.jp/personwritep/entry-12713507026.html';

        let le_style=
            '<style id="le_style">'+
            '#cke_1_contents { display: flex; flex-direction: column; } '+
            '#disp_le { margin: 0 0 5px; padding: 4px 0 1px; white-space: nowrap; '+
            'font: normal 16px/24px Meiryo; color: #fff; background: #607d8b; '+
            'user-select: none; } '+

            '#disp_le .e_hint { position: absolute; background: #607d8b; z-index: 1; } '+
            '#disp_le .hint { position: relative; } '+
            '#disp_le .hint:hover::after { position: absolute; z-index: 1; height: 23px; '+
            'padding: 1px 9px 0; font: 16px Meiryo; color: #fff; background: #000; } '+
            '#disp_le .ls_hint { margin: 0 45px 0 15px; } '+
            '#disp_le .ls_hint b { color: #a4fff7; } '+
            '#disp_le .lz_hint.hint:hover::after { top: 27px; left: -213px; '+
            'content: "　　　　　標準▸中型▸小型：Click　▲　　'+
            '軽量化Cardに変更：Ctrl+Click　　　"; } '+
            '#disp_le .lc_hint.hint:hover::after { top: 27px; left: -161px; '+
            'content: "　カラーパレット表示：Click ▲ 　"; } '+
            '#disp_le .tc_hint.hint:hover::after { top: 27px; left: -161px; '+
            'content: "　カラーパレット表示：Click ▲　"; } '+
            '#disp_le .lw_hint.hint:hover::after { top: -29px; left: -210px; '+
            'content: "　リンクURLの書換：Click ▼　 "; } '+
            '#disp_le .hint.lw_hint_w:hover::after { top: -29px; left: -210px; '+
            'content: "　リンクURLの書換：Click ▼　 "; } '+
            '#disp_le .lb_hint.hint:hover::after { top: -29px; left: -227px; '+
            'content: "　カラーパレット表示：Click ▼　"; } '+
            '#disp_le .lv_hint.hint:hover::after { top: -29px; left: -227px; '+
            'content: "　カラーパレット表示：Click ▼　"; } '+
            '#disp_le .mpl_hint.hint:hover::after { top: -29px; left: -178px; '+
            'content: "　デザイン登録：Click ▼ 　"; } '+
            '#disp_le .mp_hint.hint:hover::after { top: -29px; left: -682px; '+
            'content: "リンクマーク/ファビコン：Ctrl+Click　　強調：Shift+Click　　'+
            '登録デザインを適用：Click ▼"; } '+

            '#disp_le svg { cursor: pointer; width: 16px; height: 16px; padding: 1px; '+
            'border-radius: 2px; background: #fff; vertical-align: -3px; } '+
            '#disp_le .lz { width: 21px; fill: #333; } '+
            '#disp_le .al, #disp_le .ar { fill: #333; } '+
            '#disp_le .al, #disp_le .ac { margin-right: 4px; } '+
            '#lc_w, #tc_w { display: inline-block; overflow: hidden; width: 16px; '+
            'height: 16px; border: 1px solid #fff; background: #fff; vertical-align: -3px; } '+
            '#lc_color, #tc_color { cursor: pointer; background: #fff; } '+
            '.ud { height: 22px; width: 15px; vertical-align: 1px; border: none; '+
            'background: #fff; } '+
            'input[type="number"].ud::-webkit-inner-spin-button { '+
            'opacity: 1; height: 20px; margin-top: 2px; } '+
            '#lc_trance { margin: 0; } '+

            '#ex_disp { position: relative; } '+
            '#help_q { position: absolute; top: 6px; left: 1px; '+
            'background: none !important; } '+
            '#h_hide { position: absolute; top: 6px; left: 18px; '+
            'background: none !important; } '+
            '#url_wide { position: absolute; top: 4px; left: 37px; '+
            'background: #eceff1 !important; padding: 2px 3px 3px !important; '+
            'border-radius: 0 !important; display: none; } '+
            '.lw_hint { margin-right: 20px; } '+
            '.lw_hint_w { margin-right: 400px; } '+
            '#url_input { height: 18px; width: 282px; padding: 3px 22px 0 12px; '+
            'margin: 2px 10px 2px 0; color: #000; } '+
            '#url_input.url_input_w { width: 598px; padding: 3px 22px 0 32px; } '+
            '#disp_le .url_clear { margin: 0 12px 0 -32px; fill: #444; } '+
            '#disp_le .url_clear:hover { fill: red; } '+
            '#lb_w { display: inline-block; width: 16px; height: 16px; overflow: hidden; '+
            'border: 1px solid #fff; background: #fff; vertical-align: -3px; } '+
            '#lb_color { cursor: pointer; background: #fff; } '+
            '#lb_disp, #lbr_disp { display: inline-block; position: relative; width: 32px; '+
            'color: #fff; background: #607d8b; } '+
            '#lborder { margin: 0; } '+
            '#lbr_disp { width: 36px; margin-left: -4px; text-align: center; } '+
            '#lbr { margin-right: 20px; } '+
            '#link_mark { margin-right: 20px; } ';

        if(ua==1){
            le_style+=
                '.ud { width: 18px; padding: 0; background: none; } '+
                '#lbr { margin-right: 17px; } '+
                '#url_input.url_input_w { width: 601px; }'; }

        le_style+='</style>'


        let SVG_lz='<svg class="lz" viewBox="0 0 640 512">'+
            '<path d="M630 344L529 444c-9 9-25 9-34 0L394 344c-9-9-9-25 0-34l11'+
            '-11c10-10 25-9 34 .5L480 342V160H292a24 24 0 0 1-17-7l-16-16C244 '+
            '122 255 96 276 96H520c13 0 24 11 24 24v222l40-43c9-10 245-10 '+
            '34-.5l11 11c9 9 9 26-0 34zm-265 15A24 24 0 0 0 348 352H160V171l40 '+
            '43c9 10 25 10 34 .5l11-11c9-9 9-25 0-34L145 68c-9-9-25-9-34 0L10 '+
            '168c-9 9-9 25 0 35l11 11c10 10 25 9 34-.5L96 170V392c0 13 11 24 24 '+
            '24h244c21 0 32-26 17-41l-16-16z"></path></svg>';

        let SVG_al='<svg class="al" viewBox="0 0 256 480">'+
            '<path d="M192 127v257c0 18-22 27-34 14L29 270c-8-8-8-20 '+
            '0-28l129-129c13-13 34-4 34 14z"></path></svg>';

        let SVG_ac='<svg class="ac" viewBox="0 0 448 512">'+
            '<path fill="#fff" d="M400 32H48C22 32 0 54 0 80v352c0 27 22 48 48 '+
            '48h352c27 0 48-22 48-48V80c0-27-22-48-48-48z"></path></svg>';

        let SVG_ar='<svg class="ar" viewBox="0 0 144 480">'+
            '<path d="M0 385V127c0-18 22-27 34-14l129 129c8 8 8 20 0 '+
            '28L34 399C22 411 0 402 0 385z"></path></svg>';

        let SVG_q=
            '<svg id="help_q" viewBox="0 0 150 150">'+
            '<path style="fill: #fff" d="M66 13C56 15 47 18 39 24C-12 60 1'+
            '8 146 82 137C92 135 102 131 110 126C162 90 128 4 66 13z"></path>'+
            '<path style="fill: #607d8b" d="M67 25C2 35 18 134 82 125C1'+
            '46 115 130 16 67 25z"></path>'+
            '<path style="fill: #fff" d="M69 40C61 41 39 58 58 61C66 63 73'+
            ' 47 82 57C84 60 83 62 81 65C77 70 52 90 76 89C82 89 82 84 86 81C92 76 '+
            '98 74 100 66C105 48 84 37 69 40M70 94C58 99 66 118 78 112C90 107 82 89'+
            ' 70 94z"></path>'+
            '</svg>';

        let SVG_h=
            '<svg id="h_hide" viewBox="0 0 150 150">'+
            '<path style="fill: #fff" d="M66 13C56 15 47 18 39 24C-12 60 1'+
            '8 146 82 137C92 135 102 131 110 126C162 90 128 4 66 13z"></path>'+
            '<path style="fill: #607d8b" d="M67 25C2 35 18 134 82 125C1'+
            '46 115 130 16 67 25z"></path>'+
            '<path style="fill: #fff" d="M46 39L46 112L63 112L63 83L86 83L'+
            '86 112L103 112L103 39L86 39L86 68L63 68L63 39L46 39z"></path>'+
            '</svg>';

        let SVG_urlw=
            '<svg id="url_wide" viewBox="0 0 64 64">'+
            '<path style="fill:#444" d="M11 13C3 17 5 29 5 37C5 40 5 44 6 47C8 51 '+
            '15 55 19 52C20 51 20 50 19 49C15 45 11 46 11 38C11 33 10 25 12 21C14 '+
            '18 20 18 20 15C21 11 13 12 11 13M40 53C41 49 41 44 41 40L60 40L60 '+
            '27L41 27C41 23 41 18 40 14C34 17 29 22 25 27C23 29 21 31 21 34C21 '+
            '37 24 39 26 41C30 45 34 50 40 53z"></path></svg>';

        let SVG_urlc=
            '<svg viewBox="0 0 352 512">'+
            '<path d="M243 256l100-100c12-13 13-32 0-44l-22-22c-12-12-32-12-44 '+
            '0L176 189 76 89c-12-12-32-12-44 0L9 111c-12 12-12 32 0 44L109 256 9 '+
            '356c-12 12-12 32 0 44l22 22c12 12 32 12 44 0L176 323l100 100c12 12 32 '+
            '12 44 0l22-22c12-12 12-32 0-44L243 256z"></path></svg>';

        let SVG_w=
            '<svg id="write_url" viewBox="0 -10 256 256">';

        let SV_path=
            '<path style="fill:#333" d="M102 136L72 136C67 136 61 136 58 141C54 148 '+
            '59 153 63 158C72 169 82 180 91 191C100 201 109 212 118 222C122 226 '+
            '126 232 132 232C138 232 142 226 146 222C155 211 164 201 173 190C182 '+
            '179 192 169 201 158C205 153 210 148 207 142C203 136 198 136 192 '+
            '136L162 136C162 108 157 79 145 54C139 43 132 31 121 24C102 13 79 '+
            '13 58 17C53 18 39 20 38 27C37 31 49 29 51 29C67 27 85 32 96 45C102 53 '+
            '104 63 105 72C108 94 105 114 102 136z"/></svg>';

        let SVG_link=
            '<svg id="link_mark" viewBox="0 0 32 32">'+
            '<path style="fill: currentColor" d="M16 20C14 15 14 13 18 9C20 7 24 4 '+
            '26 7C27 10 23 16 23 19C25 18 27 16 29 14C32 9 30 1 23 1C15 2 4 17 '+
            '16 20M16 12C18 17 18 19 14 23C12 25 8 28 6 25C5 22 9 16 9 13C7 14 '+
            '5 16 3 18C-0 23 2 31 9 31C17 30 28 15 16 12z"></path></svg>';

        let SVG_mpl=
            '<svg id="memo_plus" viewBox="-45 -20 540 540">'+
            '<path fill="#333" d="M416 208H272V64c0-18-14-32-32-32h-32c-18 '+
            '0-32 14-32 32v144H32c-18 0-32 14-32 32v32c0 18 14 32 32 32h144v '+
            '144c0 18 14 32 32 32h32c18 0 32-14 32-32V304h144c18 0 32-14 '+
            '32-32v-32c0-18-14-32-32-32z"></path></svg>';

        let SVG_mps=
            '<svg id="memo_paste" viewBox="0 -10 256 256">';


        let disp=
            '<div id="disp_le">'+
            '<span class="e_hint"></span>'+
            '<span class="ls_hint hint"><b>▼</b> Card指定：Ctrl+Click</span>'+
            '<span class="lz_hint hint">型変換：'+ SVG_lz +'</span>　'+
            '配置：'+ SVG_al + SVG_ac + SVG_ar + '　'+
            '<span class="lc_hint hint">背景色：'+
            '<span id="lc_w"><span id="lc_color">　</span></span></span> '+
            '<input id="lc_trance" class="ud" type="number" max="10" min="0.1" step="0.1">'+
            '：濃度　<span class="tc_hint hint">文字色：'+
            '<span id="tc_w"><span id="tc_color">　</span></span></span> '+

            '<div id="ex_disp">'+
            '<a href="'+ help_url +'" rel="noopener noreferrer" target="_blank">'+
            SVG_q +'</a>'+ SVG_h + SVG_urlw +
            '　　 <input id="url_input" type="url" placeholder="変更するURLを入力" '+
            'autocomplete="off">'+
            '<span class="url_clear">'+ SVG_urlc +'</span>'+
            '<span id="lw_h" class="lw_hint hint">'+ SVG_w + SV_path +'</span>'+
            '枠線色：<span class="lb_hint hint">'+
            '<span id="lb_w"><span id="lb_color">　</span></span></span> '+
            '<span id="lb_disp">　</span>'+
            '<input id="lborder" class="ud" type="number" max="5" min="0"> '+
            '<span id="lbr_disp">　</span>'+
            '<input id="lbr" class="ud" type="number" max="30" min="0">'+
            '<span class="lv_hint hint">'+ SVG_link +'</span>'+
            'M：<span class="mpl_hint hint">'+ SVG_mpl +'</span> '+
            '<span class="mp_hint hint">'+ SVG_mps + SV_path +'</span>'+
            '</div>'+ le_style +
            '</div>';

        editor_iframe=document.querySelector('.cke_wysiwyg_frame');
        if(editor_iframe){
            if(!target0.querySelector('#disp_le')){
                editor_iframe.insertAdjacentHTML('beforebegin', disp); }

            iframe_doc=editor_iframe.contentWindow.document;
            if(iframe_doc){
                let iframe_html=iframe_doc.documentElement;
                iframe_body=iframe_doc.body;
                if(iframe_html && iframe_body){
                    let card_style=
                        '<style id="card_style">'+
                        '.edit_card { outline: 2px solid #2196f3; outline-offset: 6px; } '+
                        '.edit_card_e .ogpCard_link { height: auto !important; } '+
                        '.edit_card_e .ogpCard_title { display: unset !important; '+
                        'max-height: unset !important; overflow: visible !important; } '+
                        '.edit_card_e .ogpCard_description { white-space: normal !important; '+
                        'overflow: visible !important; } '+
                        '.edit_card_e .ogpCard_urlText { white-space: normal !important; '+
                        'height: auto !important; width: 100%; } '+
                        '.ogpCard_wrap *{ background-color: initial; }'+ // cke editorのリセット
                        '</style>';
                    if(!iframe_html.querySelector('#card_style')){
                        iframe_html.insertAdjacentHTML('beforeend', card_style); }}}}

        monitor0.observe(target0, {childList: true});

        let disp_le=document.querySelector('#disp_le');
        disp_le.style.display='block';

        let photos_w=document.querySelector('#js-photos-wrapper');
        photos_w.style.background='#607d8b'; // 画像パレットとメニューバー色を統一

        bg_reset();
        tx_reset();
        url_reset(); // url入力枠幅をリセット
        bd_reset();
        sv_reset();
        help_set();

    } // sign()



    function sign_clear(){
        if(target0.querySelector('#disp_le')){
            target0.querySelector('#disp_le').style.display='none'; }
        let photos_w=document.querySelector('#js-photos-wrapper');
        photos_w.style.background='';
        let url_input=document.querySelector('#url_input');
        url_input.value=''; }



    function url_reset(){
        let url_wide=document.querySelector('#url_wide');
        let url_input=document.querySelector('#url_input');
        let lw_h=document.querySelector('#lw_h');
        if(url_input.classList.contains('url_input_w')){
            url_input.classList.remove('url_input_w');
            lw_h.classList.remove('lw_hint_w');
            lw_h.classList.add('lw_hint');
            url_wide.style.display='none'; }}



    function before_end(){
        editor_iframe=document.querySelector('.cke_wysiwyg_frame');
        let submitButton=document.querySelectorAll('.js-submitButton');
        submitButton[0].addEventListener("mousedown", all_close, false);
        submitButton[1].addEventListener("mousedown", all_close, false);

        function all_close(){
            if(mode==1){
                if(!editor_iframe){ // HTML表示の場合
                    alert("⛔　LinkCard Editor が処理を終了していません\n\n"+
                          "　　 通常表示画面に戻り 編集を終了してください");
                    event.stopImmediatePropagation();
                    event.preventDefault(); }
                else if(editor_iframe){ // 通常表示の場合
                    mode=0;
                    card_close(); }}}
    } // before_end()



    function help_set(){
        if(lcard_set[11]==1){
            let hints=document.querySelectorAll('#disp_le .hint');
            for(let k=0; k<hints.length; k++){
                hints[k].classList.replace('hint', 'hint_'); }}

        let h_hide=document.querySelector('#h_hide');
        if(h_hide){
            h_hide.onclick=function(){
                let ok=confirm(
                    "　　⚫ 操作説明の表示・非表示を変更します\n"+
                    "　　　  (H) ボタンを押し何度でも変更できます");
                if(ok){
                    help_toggle();
                    let write_json=JSON.stringify(lcard_set);
                    localStorage.setItem('LinkCard Style', write_json); }}}


        function help_toggle(){
            if(lcard_set[11]==0){
                let hints=document.querySelectorAll('#disp_le .hint');
                for(let k=0; k<hints.length; k++){
                    hints[k].classList.replace('hint', 'hint_'); } // ヒント非表示
                lcard_set[11]=1; }
            else{
                let hints=document.querySelectorAll('#disp_le .hint_');
                for(let k=0; k<hints.length; k++){
                    hints[k].classList.replace('hint_', 'hint'); } // ヒントを表示
                lcard_set[11]=0; }}

    } // help_set()


} // main()
