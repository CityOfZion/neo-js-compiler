let editor, menu;

// Initialize defaults. Will load additional data from local storage if the program has been used before
let editorTabData = {
  opts: {
    lastActiveTab: 0,
    currentActiveTab: 0,
  }
};

let editors = {};
let minimumLines = 70;
let autoSaveTimer;
let newButton, openButton, saveButton, fileEntry, hasWriteAccess;
let selectionRange = {};

const {remote, clipboard} = require('electron');
const {Menu, MenuItem, dialog} = remote;
const fs = require("fs");

require("codemirror/mode/javascript/javascript");
require("codemirror/addon/edit/closebrackets");
require("codemirror/addon/edit/matchbrackets");
require("codemirror/addon/hint/show-hint");

var CodeMirror = require("codemirror/lib/codemirror.js");

onload = function () {
  initContextMenu();


  // newButton = document.getElementById("new");
  // openButton = document.getElementById("open");
  // saveButton = document.getElementById("save");
  //
  // newButton.addEventListener("click", handleNewButton);
  // openButton.addEventListener("click", handleOpenButton);
  // saveButton.addEventListener("click", handleSaveButton);
  //

  // newFile();
  onresize();
};

$(function () {
  // localStorage.setItem('editorTabData', null);
  let previousData = loadEditorTabData();
  if (previousData !== 'null') {
    // If we have stored tab data, use it. Otherwise we don't set this and use the default above.
    editorTabData = JSON.parse(previousData);
  }

  for (let n in editorTabData) {
    if (n === 'opts') {
      continue;
    }
    createEditorTab(n);
  }

  $('#editor-tabs').find('.new-doc-tab').on('click', function () {
    createEditorTab();
  });

  autoSaveTimer = setInterval(autoSaveTabData, 3000);
  $('#csByteCode').on('change', function () {
    editorTabData[editorTabData.opts.currentActiveTab].csByteCode = $(this).val();
    onresize();
  });
});

function setEditorTabActive(tabID) {
  $('.is-active').removeClass('is-active');
  $('#{0}'.format(tabID)).addClass('is-active');
  $('.editor-tab-content').addClass('hidden');
  $('#editor-{0}'.format(tabID)).removeClass('hidden');
  if (typeof(editorTabData[editorTabData.opts.currentActiveTab]) === 'undefined') {
    // last active tab has been removed, default to first tab in list
    for (let n in editorTabData) {
      if (n === 'opts') {
        continue;
      }
      editorTabData.opts.currentActiveTab = n;
      break;
    }
  }
  editorTabData.opts.lastActiveTab = editorTabData.opts.currentActiveTab;
  editorTabData.opts.currentActiveTab = tabID;
  $('#csByteCode').val(editorTabData[editorTabData.opts.currentActiveTab].csByteCode);
  console.log(editorTabData.opts);
  onresize();
}

function createEditorTab(tabID = false) {
  // add a new tab to the tab list
  let tabSourceContent = "";
  if (tabID) {
    // tab is being recreated
    tabSourceContent = editorTabData[tabID].value;
    console.log('createEditorTab() recreating tab: %s', tabID);
    console.log(editorTabData);
  } else {
    // tab is new
    tabID = 'tab-{0}'.format(Math.random().toString(36).slice(2));
    editorTabData[tabID] = {
      onChangeTimer: false,
      csByteCode: "",
      value: "",
      selectionRange: {start: 0, end: 0}
    };
  }
  let $newTab = $('#tab-template').find('li').clone();
  $newTab.attr('id', tabID);

  $newTab.find('.delete').on('click', function (e) {
    // bind the close tab button
    removeEditorTab();
    e.stopPropagation();
  });

  $newTab.on('click', function () {
    setEditorTabActive(tabID);
  });

  let $editorTabData = $('#editor-tabs ul');
  $editorTabData.insertAt($newTab, $editorTabData.children().length - 1);

  let $editorContainer = $('<div>').attr('id', 'editor-{0}'.format(tabID)).addClass('editor-tab-content hidden');
  $('#tab-content').append($editorContainer);
  // console.log($editorContainer);

  let numSourceLines = (tabSourceContent.match(/\n/g) || []).length;
  for (let i = numSourceLines; i < minimumLines; i++) {
    tabSourceContent += "\n";
  }
  // initialise a new editor for this tab
  editors[tabID] = CodeMirror(
    $editorContainer[0],
    {
      mode: {name: "javascript", json: true},
      autoCloseBrackets: true,
      matchBrackets: true,
      lineNumbers: true,
      gutter: true,
      // hintOptions: {
      //   hint: neoHints
      // },
      theme: "lesser-dark",
      extraKeys: {
        "Cmd-S": function (instance) {
          handleSaveButton()
        },
        "Ctrl-S": function (instance) {
          // handleSaveButton()
        },
        "Ctrl-Space": "autocomplete",
      },
      value: tabSourceContent,
    });

  // handle change events for this editor instance
  editors[tabID].on('change', function () {
    // editorTimer = setTimeout(function () {
    window.neo.parser.parse(editors[tabID].doc.getValue());
    // createNeoBytecode();
    // }, 1000);

    storeEditorChanges(tabID);
  });

  editors[tabID].on('cursorActivity', function (editor) {
    let needleStr = RegExp.escape(editor.getSelection().replaceAll("\n", " "));
    let needle = new RegExp(needleStr, "g");
    let haystack = editors[tabID].doc.getValue().replaceAll("\n", " ");

    let result = needle.exec(haystack);

    let selectedRange = {start: result.index, end: result.index + needleStr.length};
    editorTabData[tabID].selectionRange = selectedRange;
    console.log(selectedRange);
    let opcodeOutput = '';
    $('.hilite').removeClass('hilite');

    $('.bc-data').each(function () {
      let spanRange = {start: $(this).data('start'), end: $(this).data('end')};
      if (spanRange.start >= selectedRange.start && spanRange.start <= selectedRange.end &&
        spanRange.end >= selectedRange.start && spanRange.end <= selectedRange.end
      ) {
        $(this).addClass('hilite');
        let opCode = $(this).html().toUpperCase();
        console.log(window.neo.OpCodes.name(opCode));
        opcodeOutput += opCode + ': ' + window.neo.OpCodes.name(opCode).desc + '<br />';
      }
    });
    $('#opcode-data').html(opcodeOutput);
  });
  editors[tabID].setSize('100%', '100%');
  setEditorTabActive(tabID);
}

RegExp.escape = function (s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

String.prototype.replaceAll = function (search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};

function removeEditorTab() {
  let $activeTab = $('.is-active');

  modalConfirm('Confirm close', 'Are you sure you wish to close this tab?', function (response) {
    if (response) {
      delete editorTabData[$activeTab.attr('id')];
      $activeTab.remove();
      setEditorTabActive(editorTabData.opts.lastActiveTab);
    }
  });
}

function autoSaveTabData() {
  console.error('saving editor tab data');
  localStorage.setItem('editorTabData', JSON.stringify(editorTabData));
}

function loadEditorTabData() {
  console.error('loading editor tab data');
  return localStorage.getItem('editorTabData');
}

function storeEditorChanges(tabID) {
  editorTabData[tabID].value = editors[tabID].doc.getValue();
  console.log(editorTabData);
}

function modalConfirm(title, message, callback = false) {
  let $confirm = $('#confirm-dialog').clone();
  $confirm.css({display: 'inline'});
  $confirm.find('.modal-card-title').html(title);
  $confirm.find('.modal-card-body').html(message);
  $confirm.find('.delete, .is-danger, .is-success').on('click', function () {
    $confirm.css({display: 'none'});
    $confirm.remove();
    if (callback) {
      callback($(this).data('response') == "1" ? true : false);
    }
  });
  $('BODY').append($confirm);

}

function initContextMenu() {
  menu = new Menu();
  menu.append(new MenuItem({
    label: 'Copy',
    click: function () {
      clipboard.writeText(editor.getSelection(), 'copy');
    }
  }));
  menu.append(new MenuItem({
    label: 'Cut',
    click: function () {
      clipboard.writeText(editor.getSelection(), 'copy');
      editor.replaceSelection('');
    }
  }));
  menu.append(new MenuItem({
    label: 'Paste',
    click: function () {
      editor.replaceSelection(clipboard.readText('copy'));
    }
  }));

  window.addEventListener('contextmenu', function (ev) {
    ev.preventDefault();
    menu.popup(remote.getCurrentWindow(), ev.x, ev.y);
  }, false);
}

onscroll = function () {
  // console.log('asdfa');
  $('.info').css({bottom: '0px'});
  console.log($('.info'));
};

onresize = function () {
  let activeTabID = $('.is-active').attr('id');
  // let $container = $('#editor-{0}'.format(activeTabID));
  let $container = $('#tab-content');
  if ($container.length < 1) {
    console.log('nothing to resize');
    return;
  }

  let scrollerElement = editors[activeTabID].getScrollerElement();
  console.log('container width/height: %dx%d', $container[0].offsetWidth, $container[0].offsetHeight);
  scrollerElement.style.width = $container[0].offsetWidth + 'px';
  scrollerElement.style.height = $container[0].offsetHeight + 'px';

  editors[activeTabID].refresh();

  // console.log(editors[activeTabID].doc.getValue().trim());
  window.neo.parser.parse(editors[activeTabID].doc.getValue());

};

$.fn.insertAt = function (elements, index) {
  let children = this.children();
  if (index >= children.size()) {
    this.append(elements);
    return this;
  }
  let before = children.eq(index);
  $(elements).insertBefore(before);
  return this;
};

String.prototype.format = function () {
  let formatted = this;
  for (let i = 0; i < arguments.length; i++) {
    let regexp = new RegExp('\\{' + i + '\\}', 'gi');
    formatted = formatted.replace(regexp, arguments[i]);
  }
  return formatted;
};


function handleDocumentChange(title) {
  var mode = "javascript";
  var modeName = "JavaScript";
  if (title) {
    title = title.match(/[^/]+$/)[0];
    document.getElementById("title").innerHTML = title;
    document.title = title;
    if (title.match(/.json$/)) {
      mode = {name: "javascript", json: true};
      modeName = "JavaScript (JSON)";
    } else if (title.match(/.html$/)) {
      mode = "htmlmixed";
      modeName = "HTML";
    } else if (title.match(/.css$/)) {
      mode = "css";
      modeName = "CSS";
    }
  } else {
    document.getElementById("title").innerHTML = "[no document loaded]";
  }
  editor.setOption("mode", mode);
  document.getElementById("mode").innerHTML = modeName;
}

function newFile() {
  fileEntry = null;
  hasWriteAccess = false;
  handleDocumentChange(null);
}

function setFile(theFileEntry, isWritable) {
  fileEntry = theFileEntry;
  hasWriteAccess = isWritable;
}

function readFileIntoEditor(theFileEntry) {
  fs.readFile(theFileEntry.toString(), function (err, data) {
    if (err) {
      console.log("Read failed: " + err);
    }

    handleDocumentChange(theFileEntry);
    editor.setValue(String(data));
  });
}

function writeEditorToFile(theFileEntry) {
  var str = editor.getValue();
  fs.writeFile(theFileEntry, editor.getValue(), function (err) {
    if (err) {
      console.log("Write failed: " + err);
      return;
    }

    handleDocumentChange(theFileEntry);
    console.log("Write completed.");
  });
}

var onChosenFileToOpen = function (theFileEntry) {
  console.log(theFileEntry);
  setFile(theFileEntry, false);
  readFileIntoEditor(theFileEntry);
};

var onChosenFileToSave = function (theFileEntry) {
  setFile(theFileEntry, true);
  writeEditorToFile(theFileEntry);
};

function handleNewButton() {
  if (false) {
    newFile();
    editor.setValue("");
  } else {
    window.open('file://' + __dirname + '/index.html');
  }
}

function handleOpenButton() {
  dialog.showOpenDialog({properties: ['openFile']}, function (filename) {
    onChosenFileToOpen(filename.toString());
  });
}

function handleSaveButton() {
  if (fileEntry && hasWriteAccess) {
    writeEditorToFile(fileEntry);
  } else {
    dialog.showSaveDialog(function (filename) {
      onChosenFileToSave(filename.toString(), true);
    });
  }
}
