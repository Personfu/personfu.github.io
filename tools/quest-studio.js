(function(){
  'use strict';
  var draft=document.getElementById('draft'),result=document.getElementById('result');
  function validate(){try{var data=JSON.parse(draft.value),errors=window.validateCyberWorldContent(data);result.classList.toggle('ok',!errors.length);result.textContent=errors.length?errors.join('\n'):'STRUCTURE VALID · '+data.missions.length+' missions · independent narrative, security and browser review still required.';return errors.length?null:data;}catch(error){result.classList.remove('ok');result.textContent='Draft could not be parsed: '+error.message;return null;}}
  document.getElementById('load').onclick=function(){draft.value=JSON.stringify(window.CW_ASCENSION_DATA,null,2);validate();};
  document.getElementById('validate').onclick=validate;
  document.getElementById('import').onchange=async function(event){var file=event.target.files[0];if(!file)return;if(file.size>1048576){result.textContent='Draft exceeds 1 MiB.';return;}draft.value=await file.text();validate();};
  document.getElementById('export').onclick=function(){var data=validate();if(!data)return;var url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));var link=document.createElement('a');link.href=url;link.download='cyberworld-content-draft.json';link.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);};
})();
