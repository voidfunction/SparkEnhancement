/// <reference path="./node_modules/@types/knockout/index.d.ts" />
/// <reference path="./node_modules/@types/jquery/index.d.ts" />
/// <reference path="./node_modules/@types/angular/index.d.ts" />

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

$(() => {
    window.addEventListener("message", (event) => {
        if (event.data.data) {
            spark.data = event.data.data;
            renderInputAndOutput();
        }
    });
});


function renderInputAndOutput() {
    renderData(spark.data.inputs);
    renderData(spark.data.outputs, false);
}

function renderData(dataSet: Array<Array<string>>, isInput: boolean = true) {
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
        let v = 1;
    }
}
