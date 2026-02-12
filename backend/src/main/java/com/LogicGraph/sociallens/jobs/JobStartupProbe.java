package com.LogicGraph.sociallens.jobs;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JobStartupProbe {

    private static final Logger log = LoggerFactory.getLogger(JobStartupProbe.class);

    @Bean
    ApplicationRunner jobProbe(JobProperties props) {
        return args -> log.info("JOB PROBE => enabled={}, dailyCron={}, oauthCron={}, oauthEnabled={}",
                props.isEnabled(),
                props.getDailyRefresh().getCron(),
                props.getOauthRefresh().getCron(),
                props.getOauthRefresh().isEnabled());
    }
}
