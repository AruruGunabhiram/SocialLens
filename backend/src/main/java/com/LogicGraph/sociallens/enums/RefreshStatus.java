package com.LogicGraph.sociallens.enums;

public enum RefreshStatus {
    NEVER_RUN,
    SUCCESS,
    /** Channel and snapshot refresh succeeded, but video enrichment had partial API failures. */
    PARTIAL,
    FAILED,
    IN_PROGRESS
}
