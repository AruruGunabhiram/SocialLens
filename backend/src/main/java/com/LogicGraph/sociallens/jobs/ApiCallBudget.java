package com.LogicGraph.sociallens.jobs;

import java.util.concurrent.atomic.AtomicInteger;

public class ApiCallBudget {

    private final int maxCalls;
    private final AtomicInteger used = new AtomicInteger(0);

    public ApiCallBudget(int maxCalls) {
        this.maxCalls = Math.max(1, maxCalls);
    }

    public boolean tryConsume(int calls) {
        if (calls <= 0) return true;
        while (true) {
            int current = used.get();
            int next = current + calls;
            if (next > maxCalls) return false;
            if (used.compareAndSet(current, next)) return true;
        }
    }

    public int used() { return used.get(); }
    public int remaining() { return Math.max(0, maxCalls - used.get()); }
    public int max() { return maxCalls; }
}
