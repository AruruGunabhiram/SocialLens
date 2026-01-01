package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.user.CreateUserRequest;
import com.LogicGraph.sociallens.dto.user.UserResponse;
import com.LogicGraph.sociallens.service.UserService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    public UserResponse createUser(@RequestBody CreateUserRequest request) {
        return userService.createUser(request);
    }
}
