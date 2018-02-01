/// <reference path="../node_modules/@types/knockout/index.d.ts" />
import {JobGraph, Constants, JobStageData, JobGraphData, JobStageProcessStage, JobGraphState, InfoNodeViewModel, InfoNode} from "./JobGraph";
import ViewModel = require("./Scripts/Viva.Controls/Controls/Visualization/Graph/GraphViewModel");
import Entities = require("./Scripts/Viva.Controls/Controls/Visualization/Graph/GraphEntityViewModel");
import Widget = require("./Scripts/Viva.Controls/Controls/Visualization/Graph/GraphWidget");
import Themes = require("./Scripts/MsPortalImpl/Base/Themes");

class JobGraphDetailsViewModel
{
    protected _graphCannotLoad: KnockoutObservable<boolean>;

    public jobGraphViewModel: ViewModel.ViewModel;
    protected _jobGraph: JobGraph;
    public graphTypeDropDown: KnockoutObservableArray<string>;
    public graphTypeSelected: KnockoutObservable<string>;
    public graphTypeLabel: KnockoutObservable<string>;
    public playJobBackLabel = Constants.jobGraphPlayback;
    public jobTimeLabel:  KnockoutObservable<string>;
    public toolTip: KnockoutObservable<string>;
    public value: KnockoutObservable<number>;
    public image: KnockoutObservable<string>;
    public zoomIconUri: KnockoutObservable<string>;
    public graphLoadingComplete: KnockoutObservable<boolean>;
    public playBackDisabled: KnockoutObservable<boolean>;
    public zoomToFitLabel: KnockoutObservable<string>;
    public timeoutPointer: number = null;
    
    public playBackClick = () => {
        if (this.timeoutPointer) {
            this.pause();
            clearTimeout(this.timeoutPointer);
            this.timeoutPointer = null;
            return;
        }
        this.play();
        const stepPlayback = () => {
            if (this.value() < Constants.JobProfile.timeTicks) {
                this.value(this.value() + 1);
                this.timeoutPointer = global.setTimeout(stepPlayback, Constants.JobProfile.simulationRunTime / Constants.JobProfile.timeTicks);
            } else {
                this.pause();
                this.value(0);
                this.timeoutPointer = null;
            }
        }
        stepPlayback();
    };

    public loadJobGraphData(data: any) {
        this._initJobGraphToolbar();
        let jobStageData: JobStageData = {
            time: data.time,
            edges: data.edges,
            nodes: data.nodes.map((stage: any) => 
                 <JobStageProcessStage>{
                    id: ko.observable(stage.id),
                    name: ko.observable(stage.name),
                    rowCount: ko.observable<number>(stage.rowCount),
                    totalCount: ko.observable<number>(stage.totalCount),
                    succeededCount: ko.observable<number>(stage.succeededCount),
                    runningCount: ko.observable<number>(stage.runningCount),
                    failedCount: ko.observable<number>(stage.failedCount),
                    dataRead: ko.observable<number>(stage.dataRead),
                    dataWritten: ko.observable<number>(stage.dataWritten),
                    time: ko.observable<number>(stage.time),
                    playBackDataSlice: stage.playBackDataSlice
                }
            )
        };

        this._updateJobGraph(jobStageData);
    }

    protected _updateJobGraph(jobStageData: any): MsPortalFx.Base.Promise {
        const defer = Q.defer();
        this._jobGraph.updateStageData(jobStageData)
            .then((jobGraphData: JobGraphData) => {
                this._jobGraph.setPlaybackDilation(jobStageData.time);
                this.jobGraphViewModel.loading(false);
                //Clear existing data
                if (jobGraphData.jobNodes.length > 0) {
                    this.jobGraphViewModel.zoomToFitPadding(10);
                    this.jobGraphViewModel.scrollBarsVisibilityMode(ViewModel.GraphScrollBarsVisibilityMode.AlwaysVisible);
                    this.jobGraphViewModel.disableMouseWheelZoom(false);
                    this.jobGraphViewModel.edges.clear();
                    this.jobGraphViewModel.graphNodes.clear();
                    this.jobGraphViewModel.graphNodes.modify(() => {
                        for (const node of jobGraphData.jobNodes) {
                            this.jobGraphViewModel.graphNodes.put(node.id(), node);
                        }
                    });

                    this.jobGraphViewModel.edges.modify(() => {
                        for (const edge of jobGraphData.jobEdges) {
                            this.jobGraphViewModel.addEdge(edge);
                        }
                    });
                    this.jobGraphViewModel.zoomToFit()();
                    this.graphLoadingComplete(true);
                } 
            }).catch((reason: any) => {
                this._setJobGraphState(JobGraphState.Error, "Error", reason);
            }).finally(() => {
                defer.resolve();
            });
        return defer.promise;
    }

    protected _setJobGraphState(currentState: JobGraphState, title: string, message: string | KnockoutObservableBase<string>) {
        const messageToUse = ko.utils.wrap(message);
        const infoNode = <InfoNodeViewModel>
            {
                id: ko.observable("1"),
                title: ko.observable(title),
                message: messageToUse,
                graphState: ko.observable(currentState),
                image: ko.observable("../svg/")
            };
        this.jobGraphViewModel.zoomToFitPadding(100);
        this.jobGraphViewModel.edges.clear();
        this.jobGraphViewModel.graphNodes.clear();
        this.jobGraphViewModel.graphNodes.put(infoNode.id(), new InfoNode(infoNode));
        this.jobGraphViewModel.zoomToFit()();
        this.jobGraphViewModel.scrollBarsVisibilityMode(ViewModel.GraphScrollBarsVisibilityMode.AlwaysHidden);
        this.jobGraphViewModel.disableMouseWheelZoom(true);
    }

    public zoomButtonClick = () => {
        this.jobGraphViewModel.zoomToFit()();
    };

    public ZoomOut = () => {
        this.jobGraphViewModel.zoomOut()();
    }

    public ZoomIn =  () => {
        this.jobGraphViewModel.zoomIn()();
    }

    protected _initJobGraphToolbar() {
        this.value = ko.observable(0);
        this.graphTypeLabel = ko.observable("Display");
        this.zoomToFitLabel = ko.observable(Constants.jobGraphZoomToFit);
        this._jobGraph = new JobGraph();
        this.jobGraphViewModel = new ViewModel.ViewModel();
        const instance = new Widget.Widget($("#graph"), this.jobGraphViewModel);
        this.graphTypeSelected = ko.observable("");
        let timeoutPointer: number = null;
        this.toolTip = ko.observable("Start playback");
        this.zoomIconUri = ko.observable("../svg/FitToScreen.svg");
        this.image = ko.observable("../svg/Start.svg");
        this.jobTimeLabel = ko.observable(this._jobGraph.getPlaybackSimulationTime());
        this.graphLoadingComplete = ko.observable(false);
        this.playBackDisabled = ko.observable(true);
        this.graphTypeDropDown = ko.observableArray([Constants.jobGraphDisplayProgress, Constants.jobGraphDisplayRead, Constants.jobGraphDisplayWritten ]);
        
        this.jobTimeLabel(this._jobGraph.getPlaybackSimulationTime());
        this.graphTypeSelected.subscribe((newValue: string) => {
            this._jobGraph.setProcessInfoType(newValue);
        });

        this.value.subscribe((newValue: number) => {
            if (newValue === 0 || newValue === Constants.JobProfile.timeTicks) {
                this._jobGraph.clearPlaybackTime(newValue);
            } else {
                this._jobGraph.setPlaybackTime(newValue);
            }
            this.jobTimeLabel(this._jobGraph.getPlaybackSimulationTime());
        });

        const checkEnablePlaybackControls = (newValue: boolean) => {
            if (newValue) {
                this.playBackDisabled(false);
            } else {
                this.value(0);
                this.playBackDisabled(true);
            }
        };

        this.graphLoadingComplete.subscribe((newValue: boolean) => {
            checkEnablePlaybackControls(newValue);
        });
    }

    public play(): void {
        this.image("../svg/Stop.svg");
        this.toolTip("Stop playback");
    }

    public pause(): void {
        this.image("../svg/Start.svg");
        this.toolTip("Start playback");
    }
}

const global = window;

ko.bindingHandlers.slider = {
    init: function (element, valueAccessor, allBindingsAccessor) {
      var options = allBindingsAccessor().sliderOptions || {};
      $(element).slider(options);
      ko.utils.registerEventHandler(element, "slidechange", function (event, ui) {
          var observable = valueAccessor();
          observable(ui.value);
      });
      ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
          $(element).slider("destroy");
      });
      ko.utils.registerEventHandler(element, "slide", function (event, ui) {
          var observable = valueAccessor();
          observable(ui.value);
      });
    },
    update: function (element, valueAccessor) {
      var value = ko.utils.unwrapObservable(valueAccessor());
      if (isNaN(value)) value = 0;
      $(element).slider("value", value);
  
    }
  };

let newTheme: MsPortalFx.Base.Themes.Theme = {
    colorCode: "#333",
    imageUri: "../svg/MsPortalImpl/Themes/Theme_Light.png",
    mode: 1,
    name: "light",
    title: "Light"
};

let themeSetting = ko.observable(newTheme);
let contrastSetting = ko.observable(MsPortalFx.Base.Themes.HighContrastMode.Off);
const lifetimeManager = new FxImpl.TriggerableLifetimeManager();
const vmBasicOption = { ltm: lifetimeManager };
let themeManager = Themes.createManager(lifetimeManager, $("body"), themeSetting, contrastSetting);
//let theme = themeManager.currentTheme();

let jobGraphVM: JobGraphDetailsViewModel = new JobGraphDetailsViewModel();
window.addEventListener("message", (event) => {
    console.log(event);
    if (event.data.data) {
        jobGraphVM.loadJobGraphData(event.data.data);
        ko.applyBindings(jobGraphVM, $("#toolbar")[0]);
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
