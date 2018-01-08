/// <reference path="./node_modules/@types/knockout/index.d.ts" />
/// <reference path="./node_modules/@types/jquery/index.d.ts" />
/// <reference path="./node_modules/@types/angular/index.d.ts" />

enum DataTabButtonTye {
    Download = "download",
    Preview = "preview",
    FullPath = "fullPath",
    ReleativePath = 'releativePath',
    Unknown = 'unknown'
}

function getActionEnumType(type: string): DataTabButtonTye {
    switch (type) {
        case 'download':
            return DataTabButtonTye.Download;
        case 'preview':
            return DataTabButtonTye.Preview;
        case 'fullPath':
            return DataTabButtonTye.FullPath;
        case 'releativePath':
            return DataTabButtonTye.ReleativePath;
        default:
            return DataTabButtonTye.Unknown;
    }
}

class JobInput {
    path: string;
    format: string;
    readSchema?: string;
    batched?: boolean;
}

class JobOutput {
    path: string;
    format: string;
    mode: string;
    schema?: string;
    provider: string;
}

class ApplicationFileInfos {
    private inputs: Array<JobInput>;

    private outputs: Array<JobOutput>;
}

class ViewModel {
    public firstName: KnockoutObservable<string> = ko.observable("first");
    public lastName: KnockoutObservable<string> = ko.observable("last");
    public fullName: KnockoutComputed<string> = ko.pureComputed({
        read: () => {
            return this.firstName() + " " + this.lastName();
        },
        write: (value) => {
            const lastSpacePos = value.lastIndexOf(" ");
            if (lastSpacePos > 0) { // Ignore values with no space character
                this.firstName(value.substring(0, lastSpacePos)); // Update "firstName"
                this.lastName(value.substring(lastSpacePos + 1)); // Update "lastName"
            }
        },
        owner: this
    });

    public friends = ko.observableArray(["test1", "test2"]);
}

class SimpleListModel {
    items: KnockoutObservableArray<string>;
    itemtoAdd: KnockoutObservable<string>;

    addItem = () => {
        if (this.itemtoAdd() !== "") {
            this.items.push(this.itemtoAdd());
            this.itemtoAdd("");
        }
    };

    remove = (item) => {
        this.items.remove(item);
    }

    constructor(items: Array<string>) {
        this.items = ko.observableArray(items);
        this.itemtoAdd = ko.observable("");
    }
    public onClick = () => {
        alert("test");
    }
}

interface ISparkJobData {
    inputs: Array<Array<string>>;
    outputs: Array<Array<string>>;
}

class SparkInfo {
    data: ISparkJobData;
}

let spark: SparkInfo = new SparkInfo();
let isRendered: boolean = false;

window.addEventListener("message", (event) => {
    console.log(event);
    if (event.data.data) {
        spark.data = event.data.data;
        renderInputAndOutput();
    }
});

$(() => {
    postIframeReadyMessage();
});


function postIframeReadyMessage() {
    const message = {
        eventType: "iframeReady",
        data: "ready"
    };
    window.parent.postMessage(message, '*');
}


function renderInputAndOutput() {
    renderData(spark.data.inputs);
    renderData(spark.data.outputs, false);
    addButtonClickEvent();
}

function addButtonClickEvent() {
    $('.data-tab-button').click((event) => {
        const actionType: DataTabButtonTye = getActionEnumType(event.target.id);
        // find the row content
        const parentRowDom = $(event.target).parentsUntil('tbody');
        if (parentRowDom.length !== 3) {
            alert('incorrect row counter!');
            return;
        }
        let columns = $(parentRowDom).children('td');
        let [inputSetId, format, path] = [columns[0].innerHTML, columns[1].innerHTML, columns[2].innerHTML];
    });
}

function renderData(dataSet: Array<Array<string>>, isInput: boolean = true) {
    dataSet.forEach(elements => {
        elements.push(`
        <div class="btn-group">
            <button type="button" id="download" class="btn btn-default data-tab-button">Download</button>
            <div class="btn-group">
                <button type="button" class="data-tab-button btn btn-default dropdown-toggle" data-toggle="dropdown">...<span class="caret"></span></button>
                <ul class="dropdown-menu" role="menu">
                <li><button id="preview" class="btn btn-md btn-default data-tab-button">Preview</button></li>
                <li><button id="fullPath" class="btn btn-md btn-default data-tab-button">Copy Full Path</button></li>
                <li><button id="releativePath" class="btn btn-md btn-default data-tab-button">Copy Releative Path</button></li>
                </ul>
            </div>
        </div>
        `);
    });

    let tabId = isInput ? '#inputDataTab' : '#outputDataTab';
    let sortId = isInput ? 0 : 1;
    try {
        $(tabId).DataTable({
            data: dataSet,
            order: [[sortId, "desc"]],
                    dom: 'Bfrtip',
        buttons: [
            'copyHtml5',
            'excelHtml5',
            'csvHtml5',
            'pdfHtml5'
        ],
            statueSave: true,
            paging: true,
            ordering: true,
            info: false,
            scrollX: true,
            responsive: true
        });
    } catch (error) {
        console.log(error);
    } finally {

    }
}
