/// <reference path="../../node_modules/@types/q/index.d.ts" />
import GraphEntitiesAddition = require("./Scripts/Viva.Controls/Controls/Visualization/Graph/GraphEntitiesAddition");
import Entities = require("./Scripts/Viva.Controls/Controls/Visualization/Graph/GraphEntityViewModel");
import { INode as Node, IEdge as Edge, GShape, GGraph } from "./Ggraph";
import { Format } from "./Format";
import { totalmem } from "os";

export const Constants = {
    Icons : {
        graphVertexUri: "../../resources/svg/jobgraph-vertices.svg",
        graphTimeUri: "../../resources/svg/jobgraph-clock.svg",
        graphRowsUri: "../../resources/svg/jobgraph-rows.svg",
        graphReadUri: "../../resources/svg/jobgraph-input.svg",
        graphWriteUri: "../../resources/svg/jobgraph-output.svg",
        graphVertexUriDark: "../../resources/svg/jobgraph-vertices-dark.svg",
        graphTimeUriDark: "../../resources/svg/jobgraph-clock-dark.svg",
        graphRowsUriDark: "../../resources/svg/jobgraph-rows-dark.svg",
        graphReadUriDark: "../../resources/svg/jobgraph-input-dark.svg",
        graphWriteUriDark: "../../resources/svg/jobgraph-output-dark.svg",
        zoomToFitUri: "../../resources/svg/FitToScreen.svg"
    },
    noValue: "N/A",
    jobGraphRead: "R",
    jobGraphRowPlural : "rows",
    jobGraphRowSigular : "row",
    jobGraphStagesPlural : "tasks",
    jobGraphStageSigular : "task",
    jobGraphStageReadLow : "The amount of data read by this stage is much lower than other stages in this job",
    jobGraphStageReadHigh: "The amount of data read by this stage is much higher than other stages in this job",
    jobGraphStageWriteLow: "The amount of data written by this stage is much lower than other stages in this job",
    jobGraphStageWriteHigh: "The amount of data written by this stage is much higher than other stages in this job",
    jobGraphStageMayCauseError: "This stage may have contributed to the job failing.",
    jobGraphWrite : "W",
    Job : {
        JobStateIcons: {
            None: { text: "", "class": "ext-kona-jobProperty-progress-bar-icon-none" },
            Active: { text: "&#x2B6E;", "class": "ext-kona-jobProperty-progress-bar-icon-active ext-kona-jobProperty-progress-bar-icon-rotate-alpha" },
            Paused: { text: "&#x2016;", "class": "ext-kona-jobProperty-progress-bar-icon-paused" },
            Error: { text: "&#x21;", "class": "ext-kona-jobProperty-progress-bar-icon-error" },
            Canceled: { text: "&#x2715;", "class": "ext-kona-jobProperty-progress-bar-icon-canceled" },
            Complete: { text: "&#x2713;", "class": "ext-kona-jobProperty-progress-bar-icon-complete" },
        }
    },
    JobProfile : {
        fileName: "Profile",
        timingRowName: "timing",
        creationRowName: "creation",
        criticalPath: "criticalpath",
        failureRowName: "vertexFailureDetails",
        vertexResultComplete: "Completed",
        noParentGuid: "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
        simulationRunTime: 30000,
        timeScale: 100,
        timeTicks: 300
    },
    PhaseTypes : {
        Input: "input",
        Output: "output",
        Process: "process"
    },
    JobGraphNode : {
        GraphWidth: 688,
        ResourceNode: {
            height: 50,
            width: 220
        },
        ProcessNode: {
            height: 104,
            width: 200
        }
    },
    jobGraphZoomToFit: "Zoom to fit",
    jobGraphPlayback: "Playback",
    jobGraphDisplayRead: "Read",
    jobGraphDisplayProgress: "Progress",
    jobGraphDisplayWritten: "Written"
};

export enum ProcessInfoType {
    Progress,
    Read,
    Written
}

export interface JobStageData {
    nodes: Array<JobStageProcessStage>;
    edges: Array<JobEdge>;
    time: number;
}

export interface JobEdge {
    childId: string;
    id: string;
}

export interface JobStage {
    id: KnockoutObservable<string>;
    name: KnockoutObservable<string>;
}

export interface JobStageProcessStage extends JobStage {
    rowCount: KnockoutObservable<number>;
    totalCount: KnockoutObservable<number>;
    succeededCount: KnockoutObservable<number>;
    runningCount: KnockoutObservable<number>;
    failedCount: KnockoutObservable<number>;
    dataRead: KnockoutObservable<number>;
    dataWritten: KnockoutObservable<number>;
    time: KnockoutObservable<number>;
    playBackDataSlice: Array<StagePlaybackDataSlice>;
}

export interface StatisticsData {
    mean: number;
    median: number;
    values: number[];
    standardDeviation: number;
}

interface ProcessNodeStatisticsData {
    readData: StatisticsData;
    writeData: StatisticsData;
}

export interface StagePlaybackDataSlice {
    displayComplete: string;
    percentComplete: number;
    percentFailed: number;
    percentProgress: number;
    cssPercentComplete: string;
    cssPercentFailed: string;
    cssPercentProgress: string;
    cssPercentNone: string;
    read: number;
    write: number;
    time: number;
    readStandardDeviationColor: string;
    writeStandardDeviationColor: string;
    timeStandardDeviationColor: string;
    outlier: boolean;
    outlierText: string;
}

export class JobGraph {
    public graphLayout: JobGraphData;
    public hasPlaybackData: KnockoutObservable<boolean> = ko.observable(false);

    private _processInfoType: ProcessInfoType;

    private _jobStageMap: StringMap<ProcessData> = {};

    private _graphModeLabel: KnockoutObservable<string>;
    private _showHeatMap: KnockoutObservable<boolean> = ko.observable(false);

    private _playbackData: PlaybackData = {
        inPlayback: false,
        ticksIn: 0,
        startTime: 0,
        timeDilation: 0
    }

    constructor() {
        this._processInfoType = ProcessInfoType.Progress;
        this._graphModeLabel = ko.observable("Progress");
    }

    public updateStageData(jobStageData: JobStageData): Q.Promise<JobGraphData> {
        const defer = Q.defer<JobGraphData>();
        try {
            //Create graph nodes and edges
            const nodesAndEdges = this._populateGraphNodeAndEdge(jobStageData);

            //Need to send an empty job graph if that is the case, and ignore updates to existing graphs
            if (nodesAndEdges.newStages || nodesAndEdges.nodes.length === 0) {
                //Pass node/edge data to graphing library
                const graphContext = GGraph.ofJSON(JSON.stringify(nodesAndEdges));

                graphContext.createNodeBoundariesFromContext();
                graphContext.beginLayoutGraph(() => {
                    try {
                        //translate graph layout to what ibiza graphing library expects
                        const jobNodes: Entities.GraphNode[] = [];
                        const jobEdges: GraphEntitiesAddition.IGraphEdgeForAddition[] = [];
                        //Add process nodes
                        for (const processNode in this._jobStageMap) {
                            if (this._jobStageMap.hasOwnProperty(processNode)) {
                                const nodeInfo = graphContext.getNode(processNode);
                                if (nodeInfo) {
                                    jobNodes.push(new JobProcessNode(this._jobStageMap[processNode].node, nodeInfo.label.bounds));
                                }
                            }
                        }

                        //Add edges
                        for (let i = 0; i < graphContext.edges.length; i++) {
                            jobEdges.push({
                                startNodeId: "Stage " + graphContext.edges[i].source,
                                endNodeId: "Stage " + graphContext.edges[i].target
                            });
                        }
                        this.graphLayout = {
                            jobNodes: jobNodes,
                            jobEdges: jobEdges
                        };
                        defer.resolve(this.graphLayout);
                    } catch (e) {
                        defer.reject(e);
                    }
                });
            } else {
                defer.resolve(null);
            }
            this._createPlaybackMap();
        } catch (e) {
            defer.reject(e);
        }

        return defer.promise;
    }

    private _createPlaybackMap() {
        for (let i = 0; i <= Constants.JobProfile.timeTicks; i++) {
            this._getPlaybackSlice(i);
        }
        this._updateProcessNodes();
    }

    private _getPlaybackSlice(ticksIn: number) {
        const statistics: ProcessNodeStatisticsData = {
            readData: {
                mean: 0,
                median: 0,
                values: [],
                standardDeviation: 0
            },
            writeData: {
                mean: 0,
                median: 0,
                values: [],
                standardDeviation: 0
            }
        };
       
        this._procesStagesForProfile(statistics, ticksIn);

        this._calculateStatistics(statistics);

        this._populateStagePlaybackSliceStatistics(statistics, ticksIn);
    }

    private _procesStagesForProfile(statistics: ProcessNodeStatisticsData, ticksIn: number) {
        const simulationTime = new Date(this._playbackData.startTime + (ticksIn * this._playbackData.timeDilation * Constants.JobProfile.timeScale)).getTime();
        for (const processId in this._jobStageMap) {
            if (this._jobStageMap.hasOwnProperty(processId)) {
                this.fillStageSliceData(this._jobStageMap[processId].playbackStageSlices[ticksIn], statistics);
            }
        }
    }

    private _calculateStatistics(statistics: ProcessNodeStatisticsData) {
        this._populateStatisticsData(statistics.readData);
        this._populateStatisticsData(statistics.writeData);
    }

    private _populateStatisticsData(data: StatisticsData) {
        //mean is calcualted when the data is populated
        const totalValues = data.values.length;
        let variance = 0;
        for (let i = 0; i < totalValues; i++) {
            variance += Math.pow(data.values[i] - data.mean, 2) / totalValues;
        }
        data.standardDeviation = Math.sqrt(variance);
    }

    public setProcessInfoType(newProcessInfoType: string) {
        this._processInfoType = ProcessInfoType[newProcessInfoType];

        if (this._processInfoType === ProcessInfoType.Progress) {
            this._showHeatMap(false);
            this._graphModeLabel("Stage Progress:");
        } else if (this._processInfoType === ProcessInfoType.Read) {
            this._showHeatMap(true);
            this._graphModeLabel("Data read:");
        } else if (this._processInfoType === ProcessInfoType.Written) {
            this._showHeatMap(true);
            this._graphModeLabel("Data Written:");
        }
        this._updateProcessNodes();
    }

    public setPlaybackDilation(totalTime: number) {
        this._playbackData.timeDilation = totalTime / Constants.JobProfile.simulationRunTime;
    }

    public setPlaybackTime(ticksIn: number) {
        this._playbackData.inPlayback = true;
        this._playbackData.ticksIn = ticksIn;
        this._updateProcessNodes();
    }

    public getPlaybackSimulationTime(): string {
        return Format.durationText(this._playbackData.ticksIn * this._playbackData.timeDilation * Constants.JobProfile.timeScale);
    }

    public clearPlaybackTime(newTime: number) {
        this._playbackData.inPlayback = false;
        this._playbackData.ticksIn = newTime;
        this._updateProcessNodes();
    }

    private _populateGraphNodeAndEdge(jobJson: JobStageData): { nodes: Node[], edges: Edge[], newStages: boolean } {
        const returnValue = {
            edges: <Array<Edge>>[],
            nodes: <Array<Node>>[],
            newStages: false
        };
        for (let i = 0; i < jobJson.nodes.length; i++) {
            const processStage: JobStageProcessStage = <JobStageProcessStage>jobJson.nodes[i];
            returnValue.nodes.push(<Node>{
                id: processStage.id(),
                shape: GShape.FromString("rect"),
                label: {
                    bounds: {
                        width: Constants.JobGraphNode.ProcessNode.width,
                        height: Constants.JobGraphNode.ProcessNode.height
                    }
                }
            });

            if (!this._jobStageMap[processStage.id()]) {
                this._jobStageMap[processStage.id()] = {
                    processData: processStage,
                    playbackStageSlices: jobJson.nodes[i].playBackDataSlice,
                    node: this._createProcessNode(processStage)
                };
                returnValue.newStages = true;
            }
        }
        for (let i = 0; i < jobJson.edges.length; i++) {
            returnValue.edges.push(<any>{
                id: "edge" + returnValue.edges.length,
                source: jobJson.edges[i].childId,
                target: jobJson.edges[i].id
            });
        }
        return returnValue;
    }

    // Creates the node in the logic graph to figure out display position, also creates the nodes that will be displayed in the job graph
    private _createProcessNode(stage: JobStageProcessStage) {
        return <JobProcessNodeViewModel>{
            id: ko.observable("Stage " + stage.id()),
            name: ko.observable(stage.name()),
            time: ko.observable("N/A"),
            rows: ko.observable(stage.rowCount().toString()),
            tagHelpText: ko.observable(""),
            showheatMap: this._showHeatMap,
            showProcessTag: ko.observable(false),
            showUDOTag: ko.observable(false),
            vertexCount: ko.observable(stage.totalCount().toString()),
            read: ko.observable(stage.dataRead().toString()),
            write: ko.observable(stage.dataWritten().toString()),
            percentComplete: ko.observable(0),
            percentFailed: ko.observable(0),
            percentProgress: ko.observable(0),
            jobResult: ko.observable(false),
            nodeSelected: ko.observable(false),
            graphModeLabel: this._graphModeLabel,
            graphModeValue: ko.observable(Constants.noValue),
            percentFormatSuccess: ko.observable(Constants.noValue),
            percentFormatFailed: ko.observable(Constants.noValue),
            percentFormatProgress: ko.observable(Constants.noValue),
            percentFormatNone: ko.observable("100%"),
            heatMapColor: ko.observable("")
        };
    }

    private _updateProcessNodes() {
        for (const element in this._jobStageMap) {
            if (this._jobStageMap.hasOwnProperty(element)) {
                if (this._jobStageMap[element].processData.totalCount()) {
                    this._setUIValues(element);
                }
            }
        }
    }

    private _setUIValues(id: string) {
        const viewModel = this._jobStageMap[id].node;
        const playbackStageSlices = this._jobStageMap[id].playbackStageSlices;
        const vertexCount = this._jobStageMap[id].processData.totalCount();
        let simulationTime = Constants.JobProfile.timeTicks;

        if (this._playbackData.inPlayback) {
            simulationTime = this._playbackData.ticksIn;
        }
        if (!playbackStageSlices[simulationTime]) {
            return;
        }
        viewModel.percentComplete(playbackStageSlices[simulationTime].percentComplete);
        viewModel.percentFailed(playbackStageSlices[simulationTime].percentFailed);
        viewModel.percentProgress(playbackStageSlices[simulationTime].percentProgress);

        viewModel.read(`${Constants.jobGraphRead} : ${Format.storageSizeText(Math.floor(playbackStageSlices[simulationTime].read))}`);
        viewModel.write(`${Constants.jobGraphWrite} : ${Format.storageSizeText(Math.floor(playbackStageSlices[simulationTime].write))}`);
        viewModel.vertexCount(`${vertexCount} ${vertexCount === 1 ? Constants.jobGraphStageSigular : Constants.jobGraphStagesPlural}`);
        viewModel.time(Format.durationText(Math.round(playbackStageSlices[simulationTime].time)));

        if (this._jobStageMap[id].processData.rowCount() !== null) {
            const rowsValue = this._jobStageMap[id].processData.rowCount();
            viewModel.rows(`${rowsValue} ${rowsValue === 1 ? Constants.jobGraphRowSigular : Constants.jobGraphRowPlural}`);
        }

        viewModel.percentFormatSuccess(playbackStageSlices[simulationTime].cssPercentComplete);
        viewModel.percentFormatFailed(playbackStageSlices[simulationTime].cssPercentFailed);
        viewModel.percentFormatProgress(playbackStageSlices[simulationTime].cssPercentProgress);
        viewModel.percentFormatNone(playbackStageSlices[simulationTime].cssPercentNone);

        const tagText: string[] = [];

        if (playbackStageSlices[simulationTime].outlier) {
            viewModel.showProcessTag(true);
            tagText.push(playbackStageSlices[simulationTime].outlierText);
        } else {
            viewModel.showProcessTag(false);
        }

        if (simulationTime === Constants.JobProfile.timeTicks) {
            if (playbackStageSlices[simulationTime].percentFailed > 0 && playbackStageSlices[simulationTime].percentComplete < 100) {
                tagText.push(Constants.jobGraphStageMayCauseError);
                tagText.push(playbackStageSlices[simulationTime].outlierText);

                viewModel.showProcessTag(true);
                viewModel.jobResult(true);
            }
        } else {
            viewModel.jobResult(false);
        }

        if (tagText.length) {
            viewModel.tagHelpText(tagText.join("\n"));
        }

        if (this._processInfoType === ProcessInfoType.Progress) {
            viewModel.graphModeValue(`${playbackStageSlices[simulationTime].displayComplete}%`);
        } else if (this._processInfoType === ProcessInfoType.Read) {
            viewModel.graphModeValue(Format.storageSizeText(Math.floor(playbackStageSlices[simulationTime].read)));
            viewModel.heatMapColor(playbackStageSlices[simulationTime].readStandardDeviationColor);
        } else if (this._processInfoType === ProcessInfoType.Written) {
            viewModel.graphModeValue(Format.storageSizeText(Math.floor(playbackStageSlices[simulationTime].write)));
            viewModel.heatMapColor(playbackStageSlices[simulationTime].writeStandardDeviationColor);
        }
    }

    private fillStandardDeviationColor(stageData: StagePlaybackDataSlice, property: string, standardDeviation: number) {
        (<any>stageData)[property] = "ext-kona-heatmap-average";
        (<any>stageData)[property + "Value"] = standardDeviation;
        if (standardDeviation <= -.5) {
            (<any>stageData)[property] = "ext-kona-heatmap-one-below";
            if (standardDeviation <= -1.5) {
                (<any>stageData)[property] = "ext-kona-heatmap-two-below";
                if (standardDeviation <= -2.5) {
                    (<any>stageData)[property] = "ext-kona-heatmap-three-below";
                    if (property === "readStandardDeviationColor") {
                        stageData.outlierText = `${Constants.jobGraphStageReadLow}\n${stageData.outlierText}`;
                    } else {
                        stageData.outlierText = `${Constants.jobGraphStageWriteLow}\n${stageData.outlierText}`;
                    }
                    stageData.outlier = true;
                }
            }
        } else if (standardDeviation >= .5) {
            (<any>stageData)[property] = "ext-kona-heatmap-one-above";
            if (standardDeviation >= 1.5) {
                (<any>stageData)[property] = "ext-kona-heatmap-two-above";
                if (standardDeviation >= 2.5) {
                    (<any>stageData)[property] = "ext-kona-heatmap-three-above";
                    stageData.outlier = true;
                    if (property === "readStandardDeviationColor") {
                        stageData.outlierText = `${Constants.jobGraphStageReadHigh}\n${stageData.outlierText}`;
                    } else {
                        stageData.outlierText =  `${Constants.jobGraphStageWriteHigh}\n${stageData.outlierText}`;
                    }
                }
            }
        }
    }

    private _populateStagePlaybackSliceStatistics(statistics: ProcessNodeStatisticsData, ticksIn: number) {
        for (const processId in this._jobStageMap) {
            if (!this._jobStageMap.hasOwnProperty(processId)) {
                continue;
            }
            const currentSlice = this._jobStageMap[processId].playbackStageSlices[ticksIn];
            
            if (statistics.readData.standardDeviation !== 0) {
                this.fillStandardDeviationColor(currentSlice, "readStandardDeviationColor", (currentSlice.read - statistics.readData.mean) / statistics.readData.standardDeviation);
            }

            if (statistics.writeData.standardDeviation !== 0) {
                this.fillStandardDeviationColor(currentSlice, "writeStandardDeviationColor", (currentSlice.write - statistics.writeData.mean) / statistics.writeData.standardDeviation);
            }
        }
    }

    private fillStageSliceData(stage: StagePlaybackDataSlice, statistics: ProcessNodeStatisticsData) {
        stage.readStandardDeviationColor = "ext-kona-heatmap-average";
        stage.readStandardDeviationColor = "ext-kona-heatmap-average";
        stage.writeStandardDeviationColor = "ext-kona-heatmap-average";
        stage.timeStandardDeviationColor = "ext-kona-heatmap-average";

        let displayComplete = stage.percentComplete;

        //Only show extra decimal places if the job is in progress
        if (displayComplete > 0 && displayComplete < 100) {
            stage.displayComplete = displayComplete.toFixed(2);
        } else {
            stage.displayComplete = displayComplete.toFixed(0);
        }

        //This is to prevent the bar from using up over %100 width, none will be under 0, will always add up to 100
        let totalPercentLeft = 100;
        let cssComplete = Math.min(totalPercentLeft, parseInt(stage.percentComplete.toFixed(0)));
        const completeRemainder = stage.percentComplete - cssComplete;
        totalPercentLeft = totalPercentLeft - cssComplete;
        let cssFailed = Math.min(totalPercentLeft, parseInt(stage.percentFailed.toFixed(0)));
        const failedRemainder = stage.percentFailed - cssFailed;
        totalPercentLeft = totalPercentLeft - cssFailed;
        let cssProgress = Math.min(totalPercentLeft, parseInt(stage.percentProgress.toFixed(0)));
        const progressRemainder = stage.percentProgress - cssProgress;
        let cssNone = totalPercentLeft - cssProgress;

        //check for a case when all three css values rounded down, need to correct one css value and cssNone
        //ie true percent values: 33.34 / 33.33 / 33.33 / 0
        //uncorrected:  33 / 33 / 33 / 1
        //corrected: 34 / 33 / 33 / 0
        if (cssNone && completeRemainder && completeRemainder < .5 && failedRemainder < .5 && progressRemainder < .5) {
            cssNone = cssNone - 1;
            if (failedRemainder > completeRemainder && failedRemainder > progressRemainder) {
                cssFailed = cssFailed + 1;
            } else if (progressRemainder > completeRemainder) {
                cssProgress = cssProgress + 1;
            } else {
                cssComplete = cssComplete + 1;
            }
        }

        stage.cssPercentComplete = `${cssComplete}%`;
        stage.cssPercentFailed = `${cssFailed}%`;
        stage.cssPercentProgress = `${cssProgress}%`;
        stage.cssPercentNone = `${cssNone}%`;
    }
}

interface ProcessData {
    processData: JobStageProcessStage;
    playbackStageSlices: Array<StagePlaybackDataSlice>;
    node: JobProcessNodeViewModel;
}

export enum JobGraphState {
    Error,
    Loading,
    Information
}

export interface JobGraphData {
    jobNodes: Entities.GraphNode[];
    jobEdges: GraphEntitiesAddition.IGraphEdgeForAddition[];
}

interface PlaybackData {
    inPlayback: boolean;
    ticksIn: number;
    startTime: number;
    timeDilation: number;
}

/**
 * Interface for the simple custom node view model
 */
export interface InfoNodeViewModel {
    id: KnockoutObservable<string>;
    title: KnockoutObservable<string>;
    message: KnockoutObservable<string>;
    isLoading: KnockoutObservable<boolean>;
    graphState: KnockoutObservable<JobGraphState>;
    image: KnockoutObservable<string>;
}

export interface JobProcessNodeViewModel {
    id: KnockoutObservable<string>;
    name: KnockoutObservable<string>;
    vertexCount: KnockoutObservable<string>;
    time: KnockoutObservable<string>;
    rows: KnockoutObservable<string>;
    read: KnockoutObservable<string>;
    write: KnockoutObservable<string>;
    showheatMap: KnockoutObservable<boolean>;
    showProcessTag: KnockoutObservable<boolean>;
    tagHelpText: KnockoutObservable<string>;
    heatMapColor: KnockoutObservable<string>;
    graphModeLabel: KnockoutObservable<string>;
    graphModeValue: KnockoutObservable<string>;
    jobResult: KnockoutObservable<boolean>;
    nodeSelected: KnockoutObservable<boolean>;
    percentFormatSuccess: KnockoutObservable<string>;
    percentFormatFailed: KnockoutObservable<string>;
    percentFormatProgress: KnockoutObservable<string>;
    percentFormatNone: KnockoutObservable<string>;
    percentComplete: KnockoutObservable<number>;
    percentFailed: KnockoutObservable<number>;
    percentProgress: KnockoutObservable<number>;
}

interface JobProcessNodeFullViewModel extends JobProcessNodeViewModel {
    timeUri: KnockoutObservable<string>;
    rowsUri: KnockoutObservable<string>;
    readUri: KnockoutObservable<string>;
    writeUri: KnockoutObservable<string>;
    vertexUri: KnockoutObservable<string>;
    vertexUriDark: KnockoutObservable<string>;
    timeUriDark: KnockoutObservable<string>;
    rowsUriDark: KnockoutObservable<string>;
    readUriDark: KnockoutObservable<string>;
    writeUriDark: KnockoutObservable<string>;
}

/**
 * This is the simple custom node used in this graph control sample.
 * This node shows a string bound to a h2 element
 */
export class InfoNode extends Entities.GraphNode {
    constructor(jobNodeVM: InfoNodeViewModel) {
        super({
            x: 100,
            y: 195,
            width: 487,
            height: 110
        });
        this.id(jobNodeVM.id());

        if (jobNodeVM.graphState() === JobGraphState.Loading) {
            jobNodeVM.isLoading = ko.observable(true);
        } else {
            jobNodeVM.isLoading = ko.observable(false);
        }

        this.extensionTemplate =
            "<div data-bind='pcGraphNodeContent:null' class='ext-kona-jobProperty-graph-node-info'>" +
            "<div data-bind='visible:true' >" +
            "<div class='ext-kona-jobProperty-graph-node-info-header'><div data-bind='image:image' class='ext-kona-jobProperty-graph-node-info-image'></div>" +
            "<div data-bind='text:title' class='ext-kona-jobProperty-graph-node-info-title msportalfx-number-jumbo-adorn msportalfx-text-header-regular msportalfx-text-ellipsis'></div></div>" +
            "<div data-bind='text:message' class='ext-kona-jobProperty-graph-node-info-message'></div>" +
            "</div>" +
            "<div data-bind='visible:true'>" +
            "<div data-bind='text:title' class='ext-kona-jobProperty-graph-node-info-title-loading msportalfx-number-jumbo-adorn msportalfx-text-header-regular msportalfx-text-ellipsis'></div>" +
            "<div class='ext-kona-jobProperty-graph-node-info-image-loading'>" +
                "<img data-bind='attr: { src: image }'></img>" +
            "</div>" + 
            "</div>";
        this.extensionViewModel = jobNodeVM;
    }
}

/**
 * This is the simple custom node used in this graph control sample.
 * This node shows a string bound to a h2 element
 */
export class JobProcessNode extends Entities.GraphNode {

    private static jobGraphUris = {
        vertexUri: ko.observable(Constants.Icons.graphVertexUri),
        timeUri: ko.observable(Constants.Icons.graphTimeUri),
        rowsUri: ko.observable(Constants.Icons.graphRowsUri),
        readUri: ko.observable(Constants.Icons.graphReadUri),
        writeUri: ko.observable(Constants.Icons.graphWriteUri),
        vertexUriDark: ko.observable(Constants.Icons.graphVertexUriDark),
        timeUriDark: ko.observable(Constants.Icons.graphTimeUriDark),
        rowsUriDark: ko.observable(Constants.Icons.graphRowsUriDark),
        readUriDark: ko.observable(Constants.Icons.graphReadUriDark),
        writeUriDark: ko.observable(Constants.Icons.graphWriteUriDark)
    }

    constructor(jobNodeVM: JobProcessNodeViewModel, initialRect: Entities.IUpdateRect) {
        super(initialRect);
        this.id(jobNodeVM.id());

        const fullNodeVM: JobProcessNodeFullViewModel = <any>jobNodeVM;
        MsPortalFx.shallowCopyFromObject(fullNodeVM, JobProcessNode.jobGraphUris);

        this.selected.subscribe((newValue: boolean) => {
            if (newValue) {
                jobNodeVM.nodeSelected(true);
            } else {
                jobNodeVM.nodeSelected(false);
            }
        });

        this.extensionTemplate =
            "<div data-bind='css:{\"ext-kona-job-failed\":jobResult, \"ext-kona-node-selected\":nodeSelected, \"ext-kona-job-tagged\":showProcessTag},pcGraphNodeContent:null,attr:{title:tagHelpText}' class='ext-kona-jobProperty-graph-node-process' >" +
            "<div class='ext-kona-jobProperty-graph-node-process-footer'>" +
            "<div class='ext-kona-jobProperty-graph-node-process-row-left-cell' data-bind='text:graphModeLabel'></div>" +
            "<div class='ext-kona-jobProperty-graph-node-process-row-right-cell' data-bind='text:graphModeValue'></div>" +
            "</div>" +
            "<div class='ext-kona-jobProperty-graph-node-process-background-container' >" +
            "<div class='ext-kona-jobProperty-graph-node-process-tag' data-bind='visible:showProcessTag' >!</div>" +
            "<div data-bind='style:{width:percentFormatSuccess},visible:!showheatMap()' class='ext-kona-jobProperty-graph-node-process-percent-bar-success'></div>" +
            "<div data-bind='style:{width:percentFormatFailed},visible:!showheatMap()' class='ext-kona-jobProperty-graph-node-process-percent-bar-fail'></div>" +
            "<div data-bind='style:{width:percentFormatProgress},visible:!showheatMap()' class='ext-kona-jobProperty-graph-node-process-percent-bar-progress'></div>" +
            "<div data-bind='style:{width:percentFormatNone},visible:!showheatMap()' class='ext-kona-jobProperty-graph-node-process-percent-bar-none'></div>" +
            "<div data-bind='css:heatMapColor,visible:showheatMap()' class='ext-kona-jobProperty-graph-node-process-percent-bar-heatmap'></div>" +
            "</div>" +
            "<div class='ext-kona-jobProperty-graph-node-process-row'>" +
            "<b class='msportalfx-text-header-regular ext-kona-jobProperty-graph-node-process-row-only-cell msportalfx-text-ellipsis' data-bind='text:id' ></b>" +
            "</div>" +
            "<div class='ext-kona-jobProperty-graph-node-process-row'>" +
            "<div class='ext-kona-jobProperty-graph-node-process-row-left-cell'><img class='ext-kona-jobProperty-graph-node-process-image-label' data-bind='attr: { src: vertexUri }' /><img class='ext-kona-jobProperty-graph-node-process-image-label-dark' data-bind='attr: { src: vertexUriDark }' /><div data-bind='text:vertexCount' class='ext-kona-jobProperty-graph-node-process-text-label' ></div></div>" +
            "<div class='ext-kona-jobProperty-graph-node-process-row-right-cell'><img class='ext-kona-jobProperty-graph-node-process-image-label' data-bind='attr: { src: readUri }' /><img class='ext-kona-jobProperty-graph-node-process-image-label-dark' data-bind='attr: { src: readUriDark }' /><div data-bind='text:read' class='ext-kona-jobProperty-graph-node-process-text-label'></div></div>" +
            "</div>" +
            "<div class='ext-kona-jobProperty-graph-node-process-row'>" +
            "<div class='ext-kona-jobProperty-graph-node-process-row-left-cell'><img class='ext-kona-jobProperty-graph-node-process-image-label' data-bind='attr: { src: timeUri }' /><img class='ext-kona-jobProperty-graph-node-process-image-label-dark' data-bind='attr: { src: timeUriDark }' /><div data-bind='text:time' class='ext-kona-jobProperty-graph-node-process-text-label'></div></div>" +
            "<div class='ext-kona-jobProperty-graph-node-process-row-right-cell'><img class='ext-kona-jobProperty-graph-node-process-image-label' data-bind='attr: { src: writeUri }' /><img class='ext-kona-jobProperty-graph-node-process-image-label-dark' data-bind='attr: { src: writeUriDark }' /><div data-bind='text:write' class='ext-kona-jobProperty-graph-node-process-text-label'></div></div>" +
            "</div>" +
            "<div class='ext-kona-jobProperty-graph-node-process-row'>" +
            "<div class='ext-kona-jobProperty-graph-node-process-row-only-cell' ><img class='ext-kona-jobProperty-graph-node-process-image-label' data-bind='attr: { src: rowsUri }' /><img class='ext-kona-jobProperty-graph-node-process-image-label-dark' data-bind='attr: { src: rowsUriDark }' /><div data-bind='text:rows' class='ext-kona-jobProperty-graph-node-process-text-label'></div></div>" +
            "</div>" +
            "</div>";
        this.extensionViewModel = fullNodeVM;
    }
}
